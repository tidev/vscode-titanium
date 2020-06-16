type Target = {
	_: string;
	$: {
		device: string;
	};
}

type AppCreateOptions = {
	id: string;
	enableServices: boolean;
	folder: string;
	name: string;
	platforms: string[];
}

type ModuleCreateOptions = {
	id: string;
	folder: string;
	name: string;
	platforms: string[];
}
