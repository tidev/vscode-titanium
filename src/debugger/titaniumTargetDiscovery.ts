import { chromeConnection, chromeTargetDiscoveryStrategy, logger, TargetVersions, telemetry, Version } from '@awam/vscode-chrome-debug-core';
import { v4 as uuidv4 } from 'uuid';

export class TitaniumTargetDiscovery extends chromeTargetDiscoveryStrategy.ChromeTargetDiscovery {
	constructor () {
		super(logger, new telemetry.TelemetryReporter());
	}
	public getTarget (address: string, port: number, targetFilter?: chromeConnection.ITargetFilter, targetUrl?: string): Promise<chromeConnection.ITarget> {
		return Promise.resolve({
			description: 'Titanium Debug Target',
			devtoolsFrontendUrl: `chrome-devtools://devtools/bundled/inspector.html?experiments=true&ws=${address}:${port}`,
			id: uuidv4(),
			title: 'Titanium Debug Target',
			type: 'node',
			version: Promise.resolve(new TargetVersions(Version.unknownVersion(), Version.unknownVersion())),
			webSocketDebuggerUrl: `ws://${address}:${port}`,
		});
	}

	public async getAllTargets (address: string, port: number, targetFilter?: chromeConnection.ITargetFilter, targetUrl?: string): Promise<chromeConnection.ITarget[]> {
		const target = await this.getTarget(address, port);
		return Promise.resolve([ target ]);
	}
}
