import { LogLevel } from './common';
import { CodeBase } from '../quickpicks/creation';

export interface BaseCLIOptions {
	logLevel: LogLevel;
}

export interface CreateOptions extends BaseCLIOptions {
	id: string;
	force: boolean;
	name: string;
	platforms: string[];
	workspaceDir: string;
}
export interface CreateModuleOptions extends CreateOptions {
	codeBase?: 'swift' | 'objc';
	codeBases?: CodeBase
}

export type Target = DevelopmentTarget | DeploymentTarget;
export type DevelopmentTarget = 'device' | 'emulator' | 'macos' | 'simulator';
export type DeploymentTarget = 'dist-adhoc' | 'dist-appstore' | 'dist-macappstore' | 'dist-playstore';

export type PrettyTarget = PrettyDevelopmentTarget | PrettyDeploymentTarget;
export type PrettyDevelopmentTarget = 'Device' | 'Emulator' | 'Simulator' | 'Mac OS';
export type PrettyDeploymentTarget = 'Ad-Hoc' | 'App Store' | 'MacOS App Store' | 'Play Store';
