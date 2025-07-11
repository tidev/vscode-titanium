export type Target = {
	_: string;
	$: {
		device: string;
	};
}

export type AppCreateOptions = {
	id: string;
	folder: string;
	name: string;
	platforms: string[];
	classic?: boolean;
	dismissNotifications?: boolean;
}

export type AppBuildOptions = {
	platform: string;
	target: string;
	simulatorVersion?: string;
	deviceId?: string;
}

export type ModuleCreateOptions = {
	id: string;
	folder: string;
	name: string;
	platforms: string[];
	codeBases: {
		android?: 'java' | 'kotlin';
		ios?: 'objc' | 'swift';
	};
	dismissNotifications?: boolean;
}

export type ModuleBuildOptions = {
	platform: string;
}
