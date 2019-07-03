export interface Request {
	id: string;
	code: string;
	args: object;
}

export interface Response {
	id: string;
	result: any;
}

export interface FeedbackOptions {
	type: 'info' | 'error';
	message: string;
}

export const MESSAGE_STRING = 'titanium-debug-message';
