import * as path from 'path';
import {
	BreakpointEvent, ContinuedEvent, InitializedEvent, LoggingDebugSession, OutputEvent,
	Scope, Source, StackFrame, StoppedEvent, TerminatedEvent, Thread,
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { CDPConnection } from './v8/cdpConnection';
import {
	CDPBreakpointResolvedParams, CDPCallFrame, CDPPausedParams, CDPPropertyDescriptor,
	CDPRemoteObject, CDPScriptParsedParams, CDPSetBreakpointByUrlResult,
} from './v8/types';
import { GeneratedLocation } from './sourceMaps/types';
import { SourceMapResolver } from './sourceMaps/sourceMapResolver';

const THREAD_ID = 1;

interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments {
	platform: 'android';
	port: number;
	host?: string;
	trace?: boolean;
	/** Absolute path to the project root. Injected by resolveDebugConfiguration; falls back to cwd. */
	projectRoot?: string;
}

interface ActiveBreakpoint {
	dapId: number;
	requestedLine: number;
	/** Undefined when the source is not in the resolver (unresolvable breakpoint). */
	generatedLocation?: GeneratedLocation;
	/** Set after the CDP setBreakpointByUrl response arrives. */
	cdpBreakpointId?: string;
	/** CDP condition string — either the DAP condition or a converted logMessage. Omitted when not set. */
	cdpCondition?: string;
}

export class TitaniumNextDebugSession extends LoggingDebugSession {

	private connection?: CDPConnection;
	private readonly resolver = new SourceMapResolver();
	private attachStartedAt = 0;
	private trace = false;
	private clientInitiatedDisconnect = false;

	// scriptId → V8 URL (populated via Debugger.scriptParsed)
	private readonly scriptIdToUrl = new Map<string, string>();

	// user source path → active breakpoints for that source
	private readonly breakpointsBySource = new Map<string, ActiveBreakpoint[]>();

	// Per-source serial queue: chains CDP remove/set operations so rapid successive
	// setBreakpoints calls for the same source can't produce "already exists" errors.
	private readonly breakpointOps = new Map<string, Promise<void>>();

	// non-null while the VM is paused
	private pausedCallFrames: CDPCallFrame[] | null = null;
	private pausedExceptionData: CDPRemoteObject | null = null;

	// Per-pause handle map: variablesReference → CDP objectId. Cleared on every resume.
	private readonly variableHandles = new Map<number, string>();
	private nextVariableHandle = 1;

	private nextBreakpointId = 1;

	private exceptionBreakMode: 'none' | 'uncaught' | 'all' = 'none';

	private logEvent(message: string): void {
		if (!this.trace) {
			return;
		}
		const elapsed = this.attachStartedAt ? `+${Date.now() - this.attachStartedAt}ms` : 'pre-attach';
		this.sendEvent(new OutputEvent(`titanium-next [${elapsed}]: ${message}\n`));
	}

	private clearPauseState(): void {
		this.pausedCallFrames = null;
		this.pausedExceptionData = null;
		this.variableHandles.clear();
		this.nextVariableHandle = 1;
	}

	private allocHandle(objectId: string): number {
		const h = this.nextVariableHandle++;
		this.variableHandles.set(h, objectId);
		return h;
	}

	private buildLogPointCondition(logMessage: string): string {
		// Escape backticks and backslashes before embedding in the template literal.
		// eslint-disable-next-line no-template-curly-in-string
		const escaped = logMessage.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
		// eslint-disable-next-line no-template-curly-in-string
		const interpolated = escaped.replace(/\{([^}]*)\}/g, '${$1}');
		return `(()=>{console.log(\`${interpolated}\`);return false})()`;
	}

	private remoteObjectToValue(remoteObj: CDPRemoteObject): { value: string; variablesReference: number } {
		if (remoteObj.type === 'object' || remoteObj.type === 'function') {
			const value = remoteObj.description ?? remoteObj.type;
			const variablesReference = remoteObj.objectId ? this.allocHandle(remoteObj.objectId) : 0;
			return { value, variablesReference };
		}
		const value = remoteObj.value !== undefined
			? String(remoteObj.value)
			: (remoteObj.description ?? 'undefined');
		return { value, variablesReference: 0 };
	}

	override initializeRequest(response: DebugProtocol.InitializeResponse, _args: DebugProtocol.InitializeRequestArguments): void {
		response.body = response.body ?? {};
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsConditionalBreakpoints = true;
		response.body.supportsLogPoints = true;
		response.body.supportsExceptionInfoRequest = true;
		response.body.exceptionBreakpointFilters = [
			{ filter: 'all', label: 'Caught Exceptions' },
			{ filter: 'uncaught', label: 'Uncaught Exceptions' },
		];
		this.sendResponse(response);
	}

	override launchRequest(response: DebugProtocol.LaunchResponse, _args: DebugProtocol.LaunchRequestArguments): void {
		this.sendErrorResponse(response, 1010, 'Launch is not yet implemented for \'titanium-next\'. Use \'attach\' instead.');
	}

	override async attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): Promise<void> {
		this.attachStartedAt = Date.now();
		this.trace = args.trace === true;

		if (args.platform !== 'android') {
			this.sendErrorResponse(response, 1000, `Attach is only supported for platform 'android' (got '${args.platform}').`);
			return;
		}

		const projectRoot = args.projectRoot ?? process.cwd();
		const host = args.host ?? 'localhost';
		const wsUrl = `ws://${host}:${args.port}`;
		this.logEvent(`connecting to ${wsUrl}`);

		const connection = new CDPConnection(wsUrl);
		connection.on('close', () => {
			if (!this.clientInitiatedDisconnect) {
				this.sendEvent(new TerminatedEvent());
			}
		});

		try {
			await connection.connect();
			this.connection = connection;
			this.logEvent('WebSocket connected');

			// Subscribe before enabling domains so no events are missed.
			connection.on('Debugger.scriptParsed', (params: CDPScriptParsedParams) => {
				// Only track /-rooted URLs; SDK internals use schemes like kroll:// or ti://
				if (params.url.startsWith('/')) {
					this.scriptIdToUrl.set(params.scriptId, params.url);
				}
				const known = this.resolver.isKnownScript(params.url);
				this.logEvent(`scriptParsed: ${params.url} (id=${params.scriptId}, known=${known})`);
			});

			connection.on('Debugger.paused', (params: CDPPausedParams) => {
				const topFrame = params.callFrames[0];
				const topUrl = topFrame
					? (this.scriptIdToUrl.get(topFrame.location.scriptId) ?? topFrame.url)
					: '';

				if (params.hitBreakpoints?.length) {
					this.logEvent(`paused: hitBreakpoints=[${params.hitBreakpoints.join(', ')}]`);
				}

				// Auto-resume when paused inside SDK-internal code that the resolver
				// cannot map to user source (e.g. ti.main.js, kroll bootstrap).
				if (!this.resolver.isKnownScript(topUrl)) {
					this.logEvent(`paused in non-user script (${topUrl || 'unknown'}) — resuming`);
					connection.send('Debugger.resume').catch(err =>
						this.logEvent(`Debugger.resume error: ${(err as Error).message}`)
					);
					return;
				}

				this.pausedCallFrames = params.callFrames;
				this.pausedExceptionData = params.reason === 'exception' ? (params.data ?? null) : null;
				// V8 uses 'other' for step completions and 'debugCommand' for a user-initiated
				// pause. Map known CDP reasons to their DAP equivalents; pass through anything else.
				const cdpToDap: Record<string, string> = { other: 'step', debugCommand: 'pause' };
				let reason: string;
				if (params.reason === 'exception') {
					reason = 'exception';
				} else if (params.hitBreakpoints?.length) {
					reason = 'breakpoint';
				} else {
					reason = cdpToDap[params.reason] ?? params.reason;
				}
				this.logEvent(`paused: reason=${params.reason} url=${topUrl} line=${(topFrame?.location.lineNumber ?? -1) + 1}`);
				this.sendEvent(new StoppedEvent(reason, THREAD_ID));
			});

			// Fired when a pending setBreakpointByUrl breakpoint resolves against a
			// newly-parsed script. Updates the gutter from unverified to verified.
			connection.on('Debugger.breakpointResolved', (params: CDPBreakpointResolvedParams) => {
				const genLine = params.location.lineNumber + 1;
				this.logEvent(`breakpointResolved: cdp-id=${params.breakpointId} scriptId=${params.location.scriptId} line=${genLine}`);
				for (const bps of this.breakpointsBySource.values()) {
					const bp = bps.find(b => b.cdpBreakpointId === params.breakpointId);
					if (bp) {
						const v8url = this.scriptIdToUrl.get(params.location.scriptId);
						const userLoc = v8url
							? this.resolver.generatedToSource(v8url, genLine, params.location.columnNumber)
							: null;
						const resolvedLine = userLoc?.line ?? bp.requestedLine;
						this.sendEvent(new BreakpointEvent('changed', { id: bp.dapId, verified: true, line: resolvedLine }));
						this.logEvent(`bp ${bp.dapId} resolved → ${v8url}:${genLine} → user:${resolvedLine}`);
						return;
					}
				}
				this.logEvent(`breakpointResolved: cdp-id=${params.breakpointId} not found in active breakpoints`);
			});

			await this.resolver.init(projectRoot, args.platform);
			const resolvedScripts = this.resolver.listScripts();
			this.logEvent(`resolver initialised: ${resolvedScripts.length} scripts`);
			for (const s of resolvedScripts) {
				this.logEvent(`  resolver: ${s.v8url} → [${s.userSources.join(', ')}]`);
			}

			// Fire-and-forget: domain enables queue in the Titanium SDK during its 60-second
			// startup wait. configurationDoneRequest sends Runtime.runIfWaitingForDebugger,
			// which releases the wait and flushes the queue. Awaiting these here would
			// deadlock because their responses cannot arrive until the wait ends.
			connection.send('Runtime.enable').catch(err =>
				this.logEvent(`Runtime.enable error: ${(err as Error).message}`)
			);
			connection.send('Debugger.enable').catch(err =>
				this.logEvent(`Debugger.enable error: ${(err as Error).message}`)
			);
			this.logEvent('CDP domain enables dispatched');

			this.sendResponse(response);
			this.sendEvent(new InitializedEvent());
		} catch (err) {
			connection.disconnect();
			this.connection = undefined;
			const message = err instanceof Error ? err.message : String(err);
			this.sendErrorResponse(response, 1002, `Attach failed: ${message}`);
		}
	}

	override setBreakPointsRequest(
		response: DebugProtocol.SetBreakpointsResponse,
		args: DebugProtocol.SetBreakpointsArguments,
	): void {
		const sourcePath = args.source.path ?? '';
		const requestedBps = args.breakpoints ?? [];
		const connection = this.connection;

		this.logEvent(`setBreakpoints: source=${sourcePath} count=${requestedBps.length}`);

		// Capture prev before overwriting the map.
		const prev = this.breakpointsBySource.get(sourcePath) ?? [];

		// Build new ActiveBreakpoint entries synchronously so we can respond to DAP immediately.
		const activeBps: ActiveBreakpoint[] = requestedBps.map(reqBp => {
			const dapId = this.nextBreakpointId++;
			const generated = connection
				? this.resolver.sourceToGenerated(sourcePath, reqBp.line, 0)
				: [];
			const loc = generated[0];
			this.logEvent(`  bp#${dapId} line=${reqBp.line} → ${loc ? `${loc.url}:${loc.line}:${loc.column}` : 'unresolved (no source map match)'}`);
			let cdpCondition: string | undefined;
			if (reqBp.condition) {
				cdpCondition = reqBp.condition;
			} else if (reqBp.logMessage) {
				cdpCondition = this.buildLogPointCondition(reqBp.logMessage);
			}
			return {
				dapId,
				requestedLine: reqBp.line,
				generatedLocation: loc,
				cdpCondition,
			};
		});

		this.breakpointsBySource.set(sourcePath, activeBps);
		response.body = {
			breakpoints: activeBps.map(bp => ({ id: bp.dapId, verified: false, line: bp.requestedLine })),
		};
		this.sendResponse(response);

		if (!connection) {
			return;
		}

		// Chain CDP operations through a per-source queue so that a rapid second
		// setBreakpoints call for the same source waits for the first round's removes
		// to complete before sending new setBreakpointByUrl requests. Without this,
		// in-flight bps from round N have no cdpBreakpointId yet and can't be removed
		// before round N+1 sends the same location again ("already exists" error).
		const prevOp = this.breakpointOps.get(sourcePath) ?? Promise.resolve();
		const nextOp = prevOp
			.then(() => this.applyBreakpoints(connection, prev, activeBps))
			.catch(err => this.logEvent(`applyBreakpoints: ${(err as Error).message}`))
			.finally(() => {
				// Prune the entry once settled so the map doesn't accumulate resolved
				// Promises indefinitely across many setBreakpoints calls.
				if (this.breakpointOps.get(sourcePath) === nextOp) {
					this.breakpointOps.delete(sourcePath);
				}
			});
		this.breakpointOps.set(sourcePath, nextOp);
	}

	private async applyBreakpoints(
		connection: CDPConnection,
		prev: ActiveBreakpoint[],
		current: ActiveBreakpoint[],
	): Promise<void> {
		// Remove old CDP breakpoints first, in order, so V8 processes removes before
		// the new setBreakpointByUrl calls for the same locations.
		for (const bp of prev) {
			if (!bp.cdpBreakpointId) {
				continue;
			}
			await connection.send('Debugger.removeBreakpoint', { breakpointId: bp.cdpBreakpointId })
				.catch(err => this.logEvent(`removeBreakpoint: ${(err as Error).message}`));
		}

		// Track generated locations set in this round. Multiple user lines can map to
		// the same generated location (e.g. after V8 snapping); sending the same
		// URL+line twice produces an "already exists" CDP error.
		const locationSet = new Map<string, { breakpointId: string; verified: boolean; resolvedLine: number }>();

		for (const active of current) {
			if (!active.generatedLocation) {
				continue;
			}
			const { url, line, column } = active.generatedLocation;
			// Key by location only. Including the condition would let two BPs at the same
			// generated line produce two CDP setBreakpointByUrl calls, causing an
			// "already exists" error from V8 on the second.
			const locationKey = `${url}:${line}:${column}`;

			const existing = locationSet.get(locationKey);
			if (existing) {
				active.cdpBreakpointId = existing.breakpointId;
				this.sendEvent(new BreakpointEvent('changed', { id: active.dapId, verified: existing.verified, line: existing.resolvedLine }));
				this.logEvent(`bp ${active.dapId} duplicate of ${existing.breakpointId} → user:${existing.resolvedLine}`);
				continue;
			}

			try {
				// CDP uses 0-based line numbers; source-map returns 1-based → subtract 1.
				const cdpParams: Record<string, unknown> = {
					url,
					lineNumber: line - 1,
					columnNumber: column,
				};
				if (active.cdpCondition) {
					cdpParams.condition = active.cdpCondition;
				}
				const result = await connection.send<CDPSetBreakpointByUrlResult>('Debugger.setBreakpointByUrl', cdpParams);
				active.cdpBreakpointId = result.breakpointId;
				const verified = result.locations.length > 0;
				let resolvedLine = active.requestedLine;
				if (verified) {
					const cdpLoc = result.locations[0];
					const userLoc = this.resolver.generatedToSource(url, cdpLoc.lineNumber + 1, cdpLoc.columnNumber);
					resolvedLine = userLoc?.line ?? active.requestedLine;
					this.logEvent(`bp ${active.dapId} verified → ${url}:${cdpLoc.lineNumber + 1} → user:${resolvedLine}`);
				} else {
					this.logEvent(`bp ${active.dapId} unresolved → ${url}`);
				}
				this.sendEvent(new BreakpointEvent('changed', { id: active.dapId, verified, line: resolvedLine }));
				locationSet.set(locationKey, { breakpointId: result.breakpointId, verified, resolvedLine });
			} catch (err) {
				this.logEvent(`setBreakpointByUrl failed for ${url}: ${(err as Error).message}`);
			}
		}
	}

	override async configurationDoneRequest(
		response: DebugProtocol.ConfigurationDoneResponse,
		_args: DebugProtocol.ConfigurationDoneArguments,
	): Promise<void> {
		this.logEvent('configurationDone — waiting for breakpoint ops then releasing SDK startup wait');
		// Wait for all in-flight setBreakpointByUrl chains to complete before releasing
		// the SDK. Without this await, runIfWaitingForDebugger can race ahead of the
		// final CDP round-trips when VS Code sends setBreakpoints late in the handshake.
		await Promise.all([ ...this.breakpointOps.values() ]);
		this.connection?.send('Runtime.runIfWaitingForDebugger').catch(err =>
			this.logEvent(`runIfWaitingForDebugger error: ${(err as Error).message}`)
		);
		this.sendResponse(response);
	}

	override threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = { threads: [ new Thread(THREAD_ID, 'main') ] };
		this.sendResponse(response);
	}

	override stackTraceRequest(
		response: DebugProtocol.StackTraceResponse,
		args: DebugProtocol.StackTraceArguments,
	): void {
		const frames = this.pausedCallFrames ?? [];
		const startFrame = args.startFrame ?? 0;
		const levels = args.levels ?? frames.length;
		const slice = frames.slice(startFrame, startFrame + levels);

		this.logEvent(`stackTrace: ${frames.length} frames (slice ${startFrame}..${startFrame + slice.length})`);
		const dapFrames = slice.map((frame, i) => {
			const v8url = this.scriptIdToUrl.get(frame.location.scriptId) ?? frame.url;
			const cdpLine = frame.location.lineNumber + 1;
			// CDP 0-based lines → resolver 1-based lines; columns are 0-based in both.
			const loc = v8url
				? this.resolver.generatedToSource(v8url, cdpLine, frame.location.columnNumber)
				: null;

			const name = frame.functionName || '(anonymous)';
			if (loc) {
				this.logEvent(`  frame[${startFrame + i}] ${name}: ${v8url}:${cdpLine} → ${loc.source}:${loc.line}:${loc.column}`);
				return new StackFrame(
					startFrame + i,
					name,
					new Source(path.basename(loc.source), loc.source),
					loc.line,
					loc.column,
				);
			}
			// No source-map resolution — fall back to the raw generated file if it
			// exists in build/android/assets/ (e.g. ti.main.js, SDK bootstrap files).
			const assetPath = v8url ? this.resolver.generatedFileFor(v8url) : null;
			this.logEvent(`  frame[${startFrame + i}] ${name}: ${v8url}:${cdpLine} → unresolved (asset=${assetPath ?? 'none'})`);
			return new StackFrame(
				startFrame + i,
				name,
				assetPath
					? new Source(path.basename(assetPath), assetPath)
					: new Source(path.basename(v8url || 'unknown')),
				frame.location.lineNumber + 1,
				frame.location.columnNumber,
			);
		});

		response.body = { stackFrames: dapFrames, totalFrames: frames.length };
		this.sendResponse(response);
	}

	override scopesRequest(
		response: DebugProtocol.ScopesResponse,
		args: DebugProtocol.ScopesArguments,
	): void {
		const frame = this.pausedCallFrames?.[args.frameId];
		if (!frame) {
			response.body = { scopes: [] };
			this.sendResponse(response);
			return;
		}

		const scopes: DebugProtocol.Scope[] = (frame.scopeChain ?? []).map(cdpScope => {
			const isGlobal = cdpScope.type === 'global';
			const name = cdpScope.name ?? (cdpScope.type.charAt(0).toUpperCase() + cdpScope.type.slice(1));
			const variablesReference = cdpScope.object.objectId
				? this.allocHandle(cdpScope.object.objectId)
				: 0;
			return new Scope(name, variablesReference, isGlobal);
		});

		response.body = { scopes };
		this.sendResponse(response);
	}

	override async variablesRequest(
		response: DebugProtocol.VariablesResponse,
		args: DebugProtocol.VariablesArguments,
	): Promise<void> {
		const objectId = this.variableHandles.get(args.variablesReference);
		if (!objectId || !this.connection) {
			response.body = { variables: [] };
			this.sendResponse(response);
			return;
		}

		try {
			const result = await this.connection.send<{ result: CDPPropertyDescriptor[] }>(
				'Runtime.getProperties',
				{ objectId, ownProperties: true },
			);
			const variables: DebugProtocol.Variable[] = (result.result ?? [])
				.filter(prop => prop.enumerable)
				.map(prop => {
					const { value, variablesReference } = prop.value
						? this.remoteObjectToValue(prop.value)
						: { value: 'undefined', variablesReference: 0 };
					return { name: prop.name, value, variablesReference };
				});
			response.body = { variables };
			this.sendResponse(response);
		} catch (err) {
			this.logEvent(`variablesRequest error: ${(err as Error).message}`);
			response.body = { variables: [] };
			this.sendResponse(response);
		}
	}

	override async evaluateRequest(
		response: DebugProtocol.EvaluateResponse,
		args: DebugProtocol.EvaluateArguments,
	): Promise<void> {
		if (!this.connection) {
			this.sendErrorResponse(response, 1020, 'Not connected');
			return;
		}

		try {
			let remoteObj: CDPRemoteObject;
			if (args.frameId !== undefined) {
				const frame = this.pausedCallFrames?.[args.frameId];
				if (!frame) {
					this.sendErrorResponse(response, 1021, 'Invalid frame');
					return;
				}
				const cdpResult = await this.connection.send<{ result: CDPRemoteObject }>(
					'Debugger.evaluateOnCallFrame',
					{ callFrameId: frame.callFrameId, expression: args.expression },
				);
				remoteObj = cdpResult.result;
			} else {
				const cdpResult = await this.connection.send<{ result: CDPRemoteObject }>(
					'Runtime.evaluate',
					{ expression: args.expression },
				);
				remoteObj = cdpResult.result;
			}

			const { value, variablesReference } = this.remoteObjectToValue(remoteObj);
			response.body = { result: value, variablesReference };
			this.sendResponse(response);
		} catch (err) {
			this.sendErrorResponse(response, 1022, `Evaluation failed: ${(err as Error).message}`);
		}
	}

	override setExceptionBreakPointsRequest(
		response: DebugProtocol.SetExceptionBreakpointsResponse,
		args: DebugProtocol.SetExceptionBreakpointsArguments,
	): void {
		const filters = args.filters ?? [];
		let mode: 'none' | 'uncaught' | 'all' = 'none';
		if (filters.includes('all')) {
			mode = 'all';
		} else if (filters.includes('uncaught')) {
			mode = 'uncaught';
		}
		this.exceptionBreakMode = mode;
		this.connection?.send('Debugger.setPauseOnExceptions', { state: mode }).catch(err =>
			this.logEvent(`setPauseOnExceptions error: ${(err as Error).message}`)
		);
		this.sendResponse(response);
	}

	override exceptionInfoRequest(
		response: DebugProtocol.ExceptionInfoResponse,
		_args: DebugProtocol.ExceptionInfoArguments,
	): void {
		const data = this.pausedExceptionData;
		if (!data) {
			this.sendErrorResponse(response, 1030, 'Not paused on exception');
			return;
		}
		const description = data.description ?? (data.value !== undefined ? String(data.value) : undefined);
		const variablesReference = data.objectId ? this.allocHandle(data.objectId) : 0;
		const breakModeMap: Record<typeof this.exceptionBreakMode, DebugProtocol.ExceptionBreakMode> = {
			all: 'always', uncaught: 'unhandled', none: 'never',
		};
		const breakMode = breakModeMap[this.exceptionBreakMode];
		response.body = {
			exceptionId: data.description?.match(/^[^:]+/)?.[0] ?? data.type,
			description,
			breakMode,
		};
		(response.body as unknown as Record<string, unknown>).variablesReference = variablesReference;
		this.sendResponse(response);
	}

	override continueRequest(
		response: DebugProtocol.ContinueResponse,
		_args: DebugProtocol.ContinueArguments,
	): void {
		this.clearPauseState();
		this.connection?.send('Debugger.resume').catch(err =>
			this.logEvent(`Debugger.resume error: ${(err as Error).message}`)
		);
		this.sendEvent(new ContinuedEvent(THREAD_ID));
		response.body = { allThreadsContinued: true };
		this.sendResponse(response);
	}

	override nextRequest(
		response: DebugProtocol.NextResponse,
		_args: DebugProtocol.NextArguments,
	): void {
		this.clearPauseState();
		this.connection?.send('Debugger.stepOver').catch(err =>
			this.logEvent(`Debugger.stepOver error: ${(err as Error).message}`)
		);
		this.sendEvent(new ContinuedEvent(THREAD_ID));
		this.sendResponse(response);
	}

	override stepInRequest(
		response: DebugProtocol.StepInResponse,
		_args: DebugProtocol.StepInArguments,
	): void {
		this.clearPauseState();
		this.connection?.send('Debugger.stepInto').catch(err =>
			this.logEvent(`Debugger.stepInto error: ${(err as Error).message}`)
		);
		this.sendEvent(new ContinuedEvent(THREAD_ID));
		this.sendResponse(response);
	}

	override stepOutRequest(
		response: DebugProtocol.StepOutResponse,
		_args: DebugProtocol.StepOutArguments,
	): void {
		this.clearPauseState();
		this.connection?.send('Debugger.stepOut').catch(err =>
			this.logEvent(`Debugger.stepOut error: ${(err as Error).message}`)
		);
		this.sendEvent(new ContinuedEvent(THREAD_ID));
		this.sendResponse(response);
	}

	override disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		this.clientInitiatedDisconnect = true;
		this.resolver.dispose();
		this.breakpointOps.clear();
		this.connection?.disconnect();
		this.connection = undefined;
		super.disconnectRequest(response, args);
	}
}
