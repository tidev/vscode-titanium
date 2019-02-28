export interface RunOptions {
	buildType?: string;
	certificate?: IosCert;
	deviceId?: string;
	deviceLabel?: string;
	liveview?: boolean|null;
	platform?: string;
	provisioningProfile?: ProvisioningProfile;
	target?: string;
	keystore?: KeystoreInfo;
}

export interface KeystoreInfo {
	alias: string;
	path: string;
	password: string;
	privateKeyPassword?: string;
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
	managaged: boolean;
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
