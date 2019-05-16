export interface Request {
	id: string;
	code: string;
	args: object;
}

export interface Response {
	id: string;
	result: any;
}

export const MESSAGE_STRING = 'titanium-debug-message';
