import { ProxyServer } from '@awam/remotedebug-ios-webkit-adapter';
import { which } from 'appcd-subprocess';
import * as got from 'got';
import { URL } from 'url';
import { ChromeDebugAdapter, ChromeDebugSession, ErrorWithMessage } from 'vscode-chrome-debug-core';
import { Event } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MESSAGE_STRING, Request, TitaniumAttachRequestArgs, TitaniumLaunchRequestArgs } from '../common/extensionProtocol';
import { BuildAppOptions } from '../types/cli';
import { LogLevel } from '../types/common';

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
		const args: BuildAppOptions & TitaniumLaunchRequestArgs = {
			buildOnly: false,
			projectType: 'app',
			logLevel: LogLevel.Trace,
			buildType: 'run',
			skipJsMinify: true,
			deployType: 'development',
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
			...launchArgs
		};

		await this.checkForIWDB();

		const info: any = await this.sendRequest('BUILD', args);

		if (info.isError) {
			await this.disconnect({});
			throw new Error(info.message);
		}

		return this.attach(args);
	}

	private async attachIOS (attachArgs: TitaniumAttachRequestArgs): Promise<void> {

		await this.checkForIWDB();

		this.server = new ProxyServer();

		try {
			const simUdid = attachArgs.target === 'simulator' ? attachArgs.deviceId : null;
			await this.server.run(attachArgs.port, simUdid);
		} catch (error) {
			throw error;
		}

		const body = await this.pollForApp(`http://localhost:${attachArgs.port}/json`, 'Unable to discover app', 5);

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

	private async pollForApp (url: string, errorMessage: string, maxRetries= 5, iteration: number = 0) {
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

	private async checkForIWDB () {
		try {
			await which('ios_webkit_debug_proxy');
		} catch (error) {
			this.sendRequest('FEEDBACK', {
				type: 'error',
				message: 'Unable to find ios-webkit-debug-proxy. Please ensure it is installed'
			});
			throw new Error('Unable to start debugger');
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
