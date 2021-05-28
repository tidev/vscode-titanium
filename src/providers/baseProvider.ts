import * as utils from '../utils';
import * as vscode from 'vscode';

import { Project } from '../project';
import { ExtensionContainer } from '../container';

export class BaseProvider {
	/**
	 * Given a TextDocument from a Provider request, work backwards to fine the root of the project
	 * and then return the associated Project instance.
	 *
	 * @param {vscode.TextDocument} document - The TextDocument instance
	 *
	 * @returns {Promise<Project|undefined>} - The Project instance, or undefined if the project is not valid
	*/
	public async getProject(document: vscode.TextDocument): Promise<Project|undefined> {
		const filePath = document.uri.fsPath;
		const projectDir = await utils.findProjectDirectory(filePath);
		return ExtensionContainer.projects.get(projectDir);
	}

	/**
	 * Returns matching definitions from given files
	 *
	 * @param {Array} files files to search
	 * @param {RegExp} regExp search pattern
	 * @param {Function} callback function to return item to add to definitions array
	 *
	 * @returns {Promise<Array>}
	*/
	public async getReferences<T> (files: string[]|string, regExp: RegExp, callback: (file: string, range: vscode.Range) => T): Promise<T[]> {
		const definitions = [];
		if (!Array.isArray(files)) {
			files = [ files ];
		}
		for (const file of files) {
			let document;
			try {
				document = await vscode.workspace.openTextDocument(file);
			} catch (error) {
				// ignore the error, it's most likely the file doesn't exist
				continue;
			}
			if (document.getText().length > 0) {
				const matches = regExp.exec(document.getText());
				if (!matches) {
					continue;
				}
				for (const match of matches) {
					const position = document.positionAt(matches.index);
					definitions.push(callback(file, new vscode.Range(position.line, position.character, position.line, 0)));
				}
			}
		}
		return definitions;
	}
}
