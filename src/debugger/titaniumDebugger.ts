import { chromeConnection, ChromeDebugSession } from 'vscode-chrome-debug-core';
import { TitaniumDebugAdapter } from './titaniumDebugAdapter';
import { TitaniumPathTransformer } from './titaniumPathTransformer';
import { TitaniumSourceMapTransformer } from './titaniumSourceMapTransformer';
import { TitaniumTargetDiscovery } from './titaniumTargetDiscovery';

ChromeDebugSession.run(ChromeDebugSession.getSession({
	adapter: TitaniumDebugAdapter,
	extensionName: 'titanium-extension',
	chromeConnection: TitaniumAndroidConnection,
	pathTransformer: TitaniumPathTransformer,
	sourceMapTransformer: TitaniumSourceMapTransformer
}));
