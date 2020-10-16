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
	LastUpdateCheck = 'titanium:update:lastCheck',
	HasUpdates = 'titanium:update:hasUpdates',
	RefreshEnvironment = 'titanium:environment:refresh'
}

export enum WorkspaceState {
	LastBuildState = 'lastRunOptions',
	LastPackageState = 'lastDistOptions',
	LastKeystorePath = 'lastKeystorePath',
	LastCreationPath = 'lastCreationPath',
	LastAndroidDebug = 'lastAndroidDebugOptions',
	LastiOSDebug = 'lastiOSDebugOptions'
}
