import { workspace } from 'vscode';
import { ExtensionContainer } from '../container';
import { cleanAppArguments } from '../utils';
import {  handleInteractionError, InteractionError } from './common';

import { CleanAppOptions } from '../types/cli';

export async function cleanApplication () {
	try {
		const logLevel = ExtensionContainer.config.general.logLevel;
		const projectDir = workspace.rootPath;
		const cleanArguments: CleanAppOptions = {
			logLevel,
			projectDir,
		};
		const args = cleanAppArguments(cleanArguments);
		ExtensionContainer.terminal.runCommand(args);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
