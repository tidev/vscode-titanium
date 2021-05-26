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

export interface CreateAppOptions extends CreateOptions {
	enableServices: boolean;
}

export interface CreateModuleOptions extends CreateOptions {
	codeBase?: 'swift' | 'objc';
	codeBases?: CodeBase
}

export type Target = DevelopmentTarget | DeploymentTarget;
export type DevelopmentTarget = 'device' | 'emulator' | 'simulator';
export type DeploymentTarget = 'dist-adhoc' | 'dist-appstore' | 'dist-playstore';

export type PrettyTarget = PrettyDevelopmentTarget | PrettyDeploymentTarget;
export type PrettyDevelopmentTarget = 'Device' | 'Emulator' | 'Simulator';
export type PrettyDeploymentTarget = 'Ad-Hoc' | 'App Store' | 'Play Store';
