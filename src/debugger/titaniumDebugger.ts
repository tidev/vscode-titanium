import { chromeConnection, ChromeDebugSession } from 'vscode-chrome-debug-core';
import { TitaniumDebugAdapter } from './titaniumDebugAdapter';

ChromeDebugSession.run(ChromeDebugSession.getSession({
	adapter: TitaniumDebugAdapter,
	extensionName: 'titanium-extension',
}));
