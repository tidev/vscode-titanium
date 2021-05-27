import * as utils from '../utils';
import * as vscode from 'vscode';

import { Project } from '../project';
import { ExtensionContainer } from '../container';

export class BaseProvider {
	public async getProject(document: vscode.TextDocument): Promise<Project|undefined> {
		const filePath = document.uri.fsPath;
		const projectDir = await utils.findProjectDirectory(filePath);
		return ExtensionContainer.projects.get(projectDir);
	}
}
