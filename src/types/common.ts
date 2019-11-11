export interface KeystoreInfo {
	alias: string;
	location: string;
	password: string|undefined;
	privateKeyPassword: string|undefined;
}
export interface IosCert {
	after: string;
	before: string;
	expired: string;
	fullname: string;
	invalid: string;
	name: string;
	pem: string;
}

export interface ProvisioningProfile {
	appId: string;
	appPrefix: string;
	apsEnvironment: string;
	certs: string[];
	creationDate: string;
	devices: string[];
	entitlements: object;
	expirationDate: string;
	file: string;
	getTaskAllow: boolean;
	managed: boolean;
	name: string;
	team: string[];
	uuid: string;
}

export interface WindowsCertInfo {
	location: string|undefined;
	password: string;
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
	ios = 'iOS',
	windows = 'Windows'
}

export enum Platform {
	android = 'android',
	ios = 'ios',
	windows = 'windows'
}
