import * as fs from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';

export async function determineProjectType (projectDirectory: string): Promise<'alloy' | 'classic'> {
	if (await fs.pathExists(path.join(projectDirectory, 'app'))) {
		return 'alloy';
	} else {
		return 'classic';
	}
}

export async function getAppName (projectDirectory: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const tiappPath = path.join(projectDirectory, 'tiapp.xml');
			const fileData = fs.readFileSync(tiappPath, 'utf-8');
			const parser = new xml2js.Parser();
			parser.parseString(fileData, (err: Error, result: any) => {
				if (!err) {
					return resolve(result['ti:app'].name[0]);
				}
			});
		} catch (error) {
			return reject(error);
		}
	});

}

export function parseXmlString (xmlString: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const parser = new xml2js.Parser();
		parser.parseString(xmlString, (err: Error, result: unknown) => {
			if (!err) {
				return resolve(result);
			} else {
				return reject(err);
			}
		});
	});
}

export function sleep (time: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}

export class CommandError extends Error {
	public code = 'E_COMMAND_ERROR';
	public command: string;
	public exitCode: number;
	public output?: string;
	public signal?: string;

	constructor(message: string, command: string, exitCode: number, output?: string, signal?: string) {
		super(message);
		this.command = command;
		this.exitCode = exitCode;
		this.output = output;
		this.signal = signal;
	}
}

export interface CommandResponse {
	output: string;
}
