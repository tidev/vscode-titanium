import { LogLevel } from './common';

export interface Config {
	android: {
		keystoreAlias: string,
		keystorePath: string
	};
	build: {
		liveview: boolean
	};
	codeTemplates: {
		jsFunction: string,
		tssClass: string,
		tssId: string,
		tssTag: string
	};
	general: {
		appcCommandPath: string,
		displayBuildCommandInConsole: boolean,
		logLevel: LogLevel,
		useTerminalForBuild: boolean
	};
	ios: {
		showProvisioningProfileDetail: boolean
	};
	package: {
		distributionOutputDirectory: string
	};
	project: {
		defaultI18nLanguage: string
	};
}
