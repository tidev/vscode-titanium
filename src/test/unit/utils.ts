import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getCommonAlloyProjectDirectory } from '../common/utils';

/**
 * Returns the path to the unit tests fixtures directory
 * @returns {String}
 */
export function getUnitFixturesDirectory(): string {
	return path.join(__dirname, '../../..', 'src', 'test', 'unit', 'fixtures');
}

/**
 * Loads and returns the completions from the fixtures directory
 * @returns {Object}
 */
export function loadCompletions (): unknown {
	const rawData = fs.readFileSync(path.join(getUnitFixturesDirectory(), 'completions.json'), 'utf8');
	return JSON.parse(rawData);
}

export function getFileUri(fileName: string): vscode.Uri {
	const file = path.join(getCommonAlloyProjectDirectory(), 'app', `${fileName}`);
	return vscode.Uri.file(file);
}
