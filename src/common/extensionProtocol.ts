import { IAttachRequestArgs, ILaunchRequestArgs } from 'vscode-chrome-debug-core';

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

export interface TitaniumLaunchRequestArgs extends ILaunchRequestArgs {
	request: string;
	appRoot?: string;
	platform: 'android' | 'ios';
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	appName: string;
}

export interface TitaniumAttachRequestArgs extends IAttachRequestArgs {
	request: string;
	appRoot?: string;
	platform: 'android' | 'ios';
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	appName: string;
}

export const MESSAGE_STRING = 'titanium-debug-message';
