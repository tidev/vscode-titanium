import { ProxyServer } from '@awam/remotedebug-ios-webkit-adapter';
import * as got from 'got';
import { URL } from 'url';
import { ChromeDebugAdapter, ChromeDebugSession, IAttachRequestArgs, ILaunchRequestArgs } from 'vscode-chrome-debug-core';
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
	appName: string;
}

export interface TitaniumAttachRequestArgs extends IAttachRequestArgs {
	appRoot?: string;
	platform: 'android' | 'ios';
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	projectType: string;
	appName: string;
}

export class TitaniumDebugAdapter extends ChromeDebugAdapter {

	private idCount = 0;
	private activeRequests = new Map();
	private session: ChromeDebugSession;
	private isDisconnecting: boolean = false;
	private server: ProxyServer;

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
		} else if (platform === 'ios') {
			return this.launchIOS(launchArgs);
		}
	}

	public attach (attachArgs: TitaniumAttachRequestArgs): Promise<void> {
		const { platform } = attachArgs;
		if (platform === 'android') {
			return this.attachAndroid(attachArgs);
		} else if (platform === 'ios') {
			return this.attachIOS(attachArgs);
		}
	}

	public async disconnect (args: DebugProtocol.DisconnectArguments) {
		this.isDisconnecting = true;
		await this.cleanup();
		return super.disconnect(args);
	}

	private async launchAndroid (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const args: BuildAppOptions = {
			platform: launchArgs.platform,
			projectDir: launchArgs.appRoot,
			buildOnly: false,
			projectType: 'app',
			logLevel: LogLevel.Trace,
			buildType: 'run',
			deviceId: launchArgs.deviceId,
			debugPort: launchArgs.port || 51388,
			target: launchArgs.target || 'emulator',
			skipJsMinify: true,
			deployType: 'development'
		};
		const info: any = await this.sendRequest('BUILD', args);
		if (info.isError) {
			await this.disconnect({});
			throw new Error(info.message);
		}
		// TODO: Clean up to be more correct
		launchArgs.port = args.debugPort;
		launchArgs.cwd = args.projectDir;

		return this.attach(launchArgs);
	}

	private attachAndroid (attachArgs: TitaniumAttachRequestArgs): Promise<void> {
		return super.attach(attachArgs);
	}

	private async launchIOS (launchArgs: TitaniumLaunchRequestArgs): Promise<void> {
		const args: BuildAppOptions = {
			platform: launchArgs.platform,
			projectDir: launchArgs.appRoot,
			buildOnly: false,
			projectType: 'app',
			logLevel: LogLevel.Trace,
			buildType: 'run',
			deviceId: launchArgs.deviceId,
			debugPort: launchArgs.port || 51388,
			target: launchArgs.target || 'simulator',
			skipJsMinify: true,
			sourceMaps: true,
			deployType: 'development'
		};
		const info: any = await this.sendRequest('BUILD', args);
		if (info.isError) {
			await this.disconnect({});
			throw new Error(info.message);
		}
		launchArgs.port = args.debugPort;
		launchArgs.cwd = args.projectDir;

		if (!launchArgs.target) {
			launchArgs.target = info.target;
		}

		if (!launchArgs.deviceId) {
			launchArgs.deviceId = info.deviceId;
		}
		launchArgs.appName = info.appName;

		return this.attach(launchArgs);
	}

	private async attachIOS (attachArgs: TitaniumAttachRequestArgs): Promise<void> {

		if (this.needExtraInfo(attachArgs)) {
			const extraArgs: any = await this.sendRequest('INFO', attachArgs);
			attachArgs.deviceId = extraArgs.deviceId;
			// attachArgs.target = extraArgs.target;
		}

		this.server = new ProxyServer();

		try {
			const simUdid = attachArgs.target === 'simulator' ? attachArgs.deviceId : null;
			await this.server.run(attachArgs.port, simUdid);
		} catch (error) {
			throw error;
		}

		await this.sleep(500);

		const { body } = await got(`http://localhost:${attachArgs.port}/json`, {
			json: true
		});

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

	private needExtraInfo (args) {
		if (!args.target) {
			return true;
		}

		if (!args.deviceId) {
			return true;
		}
	}

	private sleep (time) {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, time);
		});
	}

	private cleanup () {
		this.sendRequest('END');

		if (this.server) {
			this.server.stop();
		}
	}

	private sendRequest (code, args?) {
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
