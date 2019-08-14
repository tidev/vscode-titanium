import { IAttachRequestArgs, ILaunchRequestArgs } from 'vscode-chrome-debug-core';
import { LogLevel } from '../types/common';

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
	projectDir: string;
	platform: 'android' | 'ios';
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	appName: string;
	logLevel: LogLevel;
}

export interface TitaniumAttachRequestArgs extends IAttachRequestArgs {
	request: string;
	projectDir: string;
	platform: 'android' | 'ios';
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	appName: string;
	logLevel: LogLevel;
}

export const MESSAGE_STRING = 'titanium-debug-message';
