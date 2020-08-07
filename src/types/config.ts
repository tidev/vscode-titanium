import { LogLevel } from './common';

export interface Config {
	android: {
		keystoreAlias: string | undefined;
		keystorePath: string | undefined;
	};
	build: {
		liveview: boolean;
	};
	codeTemplates: {
		jsFunction: string;
		tssClass: string;
		tssId: string;
		tssTag: string;
	};
	general: {
		appcCommandPath: string;
		defaultCreationDirectory?: string;
		displayBuildCommandInConsole: boolean;
		logLevel: LogLevel;
		useTerminalForBuild: boolean;
		updateFrequency: string;
	};
	package: {
		distributionOutputDirectory: string;
	};
	project: {
		defaultI18nLanguage: string;
	};
}
