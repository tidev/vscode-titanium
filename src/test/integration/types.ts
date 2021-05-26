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
	}
}

export type ModuleBuildOptions = {
	platform: string;
}
