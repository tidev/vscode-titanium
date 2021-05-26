import { AppBuildTaskTitaniumBuildBase } from '../tasks/buildTaskProvider';
import { UpdateInfo } from 'titanium-editor-commons/updates';

export interface KeystoreInfo {
	alias: string;
	location: string;
	password: string;
	privateKeyPassword: string|undefined;
}
export interface IosCert {
	after: string;
	before: string;
	expired: string|boolean;
	fullname: string;
	invalid: string|boolean;
	name: string;
	pem: string;
}

export interface ProvisioningProfile {
	appId: string;
	appPrefix: string;
	apsEnvironment: string;
	certs: string[];
	creationDate: string;
	devices: string[]|null;
	entitlements: Record<string, unknown>;
	expirationDate: string;
	file: string;
	getTaskAllow: boolean;
	managed: boolean;
	name: string;
	team: string[];
	uuid: string;
}

export enum LogLevel {
	Debug = 'debug',
	Error = 'error',
	Info = 'info',
	Trace = 'trace',
	Warn = 'warn'
}

export type IosCertificateType = 'developer' | 'distribution';

export type IosProvisioningType = 'development' | 'distribution' | 'appstore';

export type PlatformPretty = 'Android' | 'iOS';

export type Platform = 'android' | 'ios';

export interface UpdateChoice extends Omit<UpdateInfo, 'hasUpdate' | 'releaseNotes'> {
	label: string;
	picked: boolean;
	id: string;
}

export interface LastBuildState extends AppBuildTaskTitaniumBuildBase {
	deviceId: string;
	target: 'device' | 'emulator' | 'simulator';
}

export type ProjectType = 'app' | 'module';
