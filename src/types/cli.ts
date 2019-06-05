import { KeystoreInfo, LogLevel } from './common';

export interface BaseCLIOptions {
	logLevel: LogLevel;
}

export interface BaseBuildOptions extends BaseCLIOptions {
	buildOnly: boolean;
	buildType: string;
	platform: 'android' | 'ios' | 'windows';
	projectDir: string;
	projectType: 'app' | 'module';
}

export interface BuildAppOptions extends BaseBuildOptions {
	iOSCertificate?: string;
	deviceId?: string;
	deviceLabel?: string;
	liveview?: boolean;
	iOSProvisioningProfile?: string;
	target?: string;
	keystore?: string;
	debugPort?: number;
	skipJsMinify?: boolean;
}

export interface BuildModuleOptions extends BaseBuildOptions {
	outputDirectory?: string;
}

export interface PackageOptions extends BaseCLIOptions {
	iOSCertificate?: string;
	iOSProvisioningProfile?: string;
	keystoreInfo: KeystoreInfo;
	outputDirectory: string;
	platform: 'android' | 'ios' | 'windows';
	projectDir: string;
	target: string;
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
}
