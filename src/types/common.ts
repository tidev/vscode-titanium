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

export enum IosCertificateType {
	developer = 'developer',
	distribution = 'distribution'
}

export enum PlatformPretty {
	android = 'Android',
	ios = 'iOS'
}

export enum Platform {
	android = 'android',
	ios = 'ios'
}

export interface UpdateChoice extends Omit<UpdateInfo, 'hasUpdate' | 'releaseNotes'> {
	label: string;
	picked: boolean;
	id: string;
}
