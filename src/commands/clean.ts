import * as path from 'path';
import { workspace } from 'vscode';
import { ExtensionContainer } from '../container';
import project from '../project';
import { selectPlatform } from '../quickpicks/common';
import { cleanAppArguments, isValidPlatform } from '../utils';
import { handleInteractionError, InteractionError } from './common';

import { CleanAppOptions } from '../types/cli';

export async function cleanApplication () {
	try {
		const logLevel = ExtensionContainer.config.general.logLevel;
		let projectDir = workspace.rootPath;

		if (project.isTitaniumModule) {
			const platformInfo = await selectPlatform('', isValidPlatform);
			projectDir = path.join(projectDir, platformInfo.id);
		}

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
