import { ChromeDebugAdapter, ChromeDebugSession, ILaunchRequestArgs } from 'vscode-chrome-debug-core';
import { Event } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MESSAGE_STRING, Request } from '../common/extensionProtocol';
import { BuildAppOptions } from '../types/cli';
import { LogLevel } from '../types/common';

export interface TitaniumLaunchRequestArgs extends ILaunchRequestArgs {
	appRoot?: string;
	platform: 'android' | 'ios';
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	projectType: string;
}
export class TitaniumDebugAdapter extends ChromeDebugAdapter {

	private idCount = 0;
	private activeRequests = new Map();
	private session: ChromeDebugSession;

	constructor (adapterOpts, session) {
		super(adapterOpts, session);
		this.session = session;
	}

	public commonArgs (args: TitaniumLaunchRequestArgs) {
		args.sourceMaps = typeof args.sourceMaps === 'undefined' || args.sourceMaps;
		super.commonArgs(args);
	}

	public launch (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const { platform } = launchArgs;
		if (platform === 'android') {
			return this.launchAndroid(launchArgs);
		}
	}

	public async launchAndroid (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const args: BuildAppOptions = {
			platform: launchArgs.platform,
			projectDir: launchArgs.appRoot,
			buildOnly: false,
			projectType: 'app',
			logLevel: LogLevel.Trace,
			buildType: 'run',
			deviceId: launchArgs.deviceId,
			debugPort: launchArgs.port || 51388,
			target: launchArgs.target || 'emulator'
		};
		const info: any = await this.sendRequest('BUILD', args);
		// TODO: Clean up to be more correct
		launchArgs.port = args.debugPort;
		launchArgs.cwd = args.projectDir;
		// TODO: Improve the projectType interface
		const projectType = info.alloyProject ? 'alloy' : 'classic';
		(this.pathTransformer as any).configureTransformOptions(launchArgs, projectType);
		(this.sourceMapTransformer as any).configureOptions(launchArgs, projectType);

		return super.attach(launchArgs);
	}

	public disconnect (args: DebugProtocol.DisconnectArguments) {
		this.sendRequest('END', args);
		super.disconnect(args);
	}

	private sendRequest (code, args) {
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

	private extensionResponse (request) {
		const resolver = this.activeRequests.get(request.id);
		if (resolver) {
			resolver(request.result);
		}
		this.activeRequests.delete(request.id);
	}
}
