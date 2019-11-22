import { ProxyServer } from '@awam/remotedebug-ios-webkit-adapter';
import { ChromeDebugAdapter, Crdp } from '@awam/vscode-chrome-debug-core';
import * as got from 'got';
import { URL } from 'url';
import { Event } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MESSAGE_STRING, Request, Response, TitaniumAttachRequestArgs, TitaniumLaunchRequestArgs } from '../common/extensionProtocol';
import { BuildAppOptions } from '../types/cli';
import { LogLevel } from '../types/common';

export class TitaniumDebugAdapter extends ChromeDebugAdapter {

	private activeRequests = new Map();
	private deviceId: string|undefined;
	private idCount = 0;
	private isDisconnecting = false;
	private platform: string|undefined;
	private port: number|undefined;
	private server!: ProxyServer;
	private target: string|undefined;

	public commonArgs (args: TitaniumLaunchRequestArgs) {
		args.sourceMaps = typeof args.sourceMaps === 'undefined' || args.sourceMaps;
		this.deviceId = args.deviceId;
		this.platform = args.platform;
		this.port = args.port;
		this.target = args.target;
		super.commonArgs(args);
	}

	public launch (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const { platform } = launchArgs;
		if (platform === 'android') {
			return this.launchAndroid(launchArgs);
		} else if (platform === 'ios') {
			return this.launchIOS(launchArgs);
		} else {
			throw new Error(`Unknown platform ${platform}`);
		}
	}

	public attach (attachArgs: TitaniumAttachRequestArgs): Promise<void> {
		const { platform } = attachArgs;
		if (platform === 'android') {
			return this.attachAndroid(attachArgs);
		} else if (platform === 'ios') {
			return this.attachIOS(attachArgs);
		} else {
			throw new Error(`Unknown platform ${platform}`);
		}
	}

	public async disconnect (args: DebugProtocol.DisconnectArguments) {
		this.isDisconnecting = true;
		await this.cleanup();
		return super.disconnect(args);
	}

	protected globalEvaluate (args: Crdp.Runtime.EvaluateRequest): Promise<Crdp.Runtime.EvaluateResponse> {
		// On Android we don't correctly handle no contextId being sent in an evaluate request
		if (this.platform === 'android' && !args.contextId) {
			args.contextId = 1;
		}

		return super.globalEvaluate(args);
	}

	private async launchAndroid (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const args: BuildAppOptions & TitaniumLaunchRequestArgs = {
			buildOnly: false,
			projectType: 'app',
			logLevel: LogLevel.Trace,
			buildType: 'run',
			skipJsMinify: true,
			deployType: 'development',
			liveview: false,
			...launchArgs
		};

		const info: any = await this.sendRequest('BUILD', args);

		if (info.isError) {
			await this.disconnect({});
			throw new Error(info.message);
		}

		return this.attach(args);
	}

	private attachAndroid (attachArgs: TitaniumAttachRequestArgs): Promise<void> {
		return super.attach(attachArgs);
	}

	private async launchIOS (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const args: BuildAppOptions & TitaniumLaunchRequestArgs = {
			buildOnly: false,
			projectType: 'app',
			logLevel: LogLevel.Trace,
			buildType: 'run',
			skipJsMinify: true,
			sourceMaps: true,
			deployType: 'development',
			liveview: false,
			...launchArgs
		};

		const info: any = await this.sendRequest('BUILD', args);

		if (info.isError) {
			await this.disconnect({});
			throw new Error(info.message);
		}

		return this.attach(args);
	}

	private async attachIOS (attachArgs: TitaniumAttachRequestArgs): Promise<void> {

		this.server = new ProxyServer();

		try {
			const simUdid = attachArgs.target === 'simulator' ? attachArgs.deviceId : undefined;
			await this.server.run(attachArgs.port, simUdid);
		} catch (error) {
			await this.disconnect({});
			throw error;
		}

		let body;
		try {
			body = await this.pollForApp(`http://localhost:${attachArgs.port}/json`, 'Unable to discover app', 10);
		} catch (error) {
			await this.disconnect({});
			throw error;
		}

		for (const context of body) {
			if (context.metadata) {
				const { metadata } = context;
				// Simulators only show as SIMULATOR, devices show as their UDID
				const contextDeviceId = attachArgs.target === 'simulator' ? 'SIMULATOR' : attachArgs.deviceId;
				if (metadata.deviceId === contextDeviceId) {
					const url = new URL(`http://${metadata.url}`);
					attachArgs.port = parseInt(url.port, 10);
					attachArgs.websocketUrl = context.webSocketDebuggerUrl;
					break;
				}
			}
		}

		return super.attach(attachArgs);
	}

	private async pollForApp (url: string, errorMessage: string, maxRetries = 5, iteration = 0): Promise<Array<{ metadata: { deviceId: string; url: string }; webSocketDebuggerUrl: string }>> {
		if (iteration > maxRetries) {
			throw Error(errorMessage);
		}

		await this.sleep(250);

		let body;
		try {
			const resp = await got(url, {
				json: true
			});
			body = resp.body;
		} catch (error) {
			// squelch
		}
		if (body && body.length > 0) {
			return body;
		}

		return this.pollForApp(url, errorMessage, maxRetries, iteration + 1);
	}

	private sleep (time: number) {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, time);
		});
	}

	private cleanup () {
		this.sendRequest('END', {
			platform: this.platform,
			deviceId: this.deviceId,
			port: this.port,
			target: this.target
		});

		if (this.server) {
			this.server.stop();
		}
	}

	private sendRequest (code: string, args?: object) {
		const request: Request = {
			id: `request-${++this.idCount}`,
			code,
			args
		};

		return new Promise(resolve => {
			this.activeRequests.set(request.id, resolve);

			this.session.sendEvent(new Event(MESSAGE_STRING, request));
		});
	}

	private extensionResponse (request: Response) {
		const resolver = this.activeRequests.get(request.id);
		if (resolver) {
			resolver(request.result);
		}
		this.activeRequests.delete(request.id);
	}
}
