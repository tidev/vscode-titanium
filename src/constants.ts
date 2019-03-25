export const ExtensionId = 'titanium';

export enum VSCodeCommands {
	OpenFolder = 'vscode.openFolder',
	SetContext = 'setContext'
}

export enum CommandContext {

}

export enum GlobalState {
	Enabled = 'titanium:enabled',
	Liveview = 'titanium:liveview',
	Running = 'titanium:build:running',
}

export enum WorkspaceState {
	LastBuildState = 'lastRunOptions',
	LastPackageState = 'lastDistOptions',
	LastKeystorePath = 'lastKeystorePath'
}
