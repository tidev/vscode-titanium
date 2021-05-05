import * as fs from 'fs-extra';
import * as walkSync from 'klaw-sync';
import * as path from 'path';
import * as utils from '../../utils';

import { DefinitionLink, Hover, Location, MarkdownString, Position, Range, Selection, TextDocument, Uri, workspace, WorkspaceEdit, Definition, Command } from 'vscode';
import { ExtensionContainer } from '../../container';
import { DefinitionSuggestion, getProject } from './common';
import { Project } from '../..//project';

/**
 * Definition provider helper
 *
 * note behaviour with multiple defintions: https://github.com/Microsoft/vscode/issues/31046
 */

export const insertCommandId = 'titanium.insertCodeAction';
export const insertI18nStringCommandId = 'titanium.insertI18nStringCodeAction';

/**
 * Provide hover
 *
 * Displays preview image when hovering over image paths
 *
 * @param {TextDocument} document active text document
 * @param {Position} position caret position
 *
 * @returns {Hover}
 */
export async function provideHover (document: TextDocument, position: Position): Promise<Hover|undefined> {
	const project = await getProject(document);

	if (!project) {
		return;
	}

	const line = document.lineAt(position).text;
	const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
	// const wordRange = document.getWordRangeAtPosition(position);
	// const word = wordRange ? document.getText(wordRange) : null;

	const regExp = /['"]/g;
	let startIndex = 0;
	let endIndex = position.character;

	for (let matches = regExp.exec(line); matches !== null; matches = regExp.exec(line)) {
		if (matches.index < position.character) {
			startIndex = matches.index;
		} else if (matches.index > position.character) {
			endIndex = matches.index;
			break;
		}
	}

	const value = (startIndex && endIndex) ? line.substring(startIndex + 1, endIndex) : null;

	if (!value || value.length === 0) {
		return;
	}

	if (/image\s*[=:]\s*["'][\s0-9a-zA-Z-_^./]*$/.test(linePrefix)) {
		const relativePath = path.parse(value);
		const dir = path.join(project?.filePath, 'app', 'assets');
		const fileNameRegExp = new RegExp(`${relativePath.name}.*${relativePath.ext}$`);
		const files = walkSync(dir, {
			nodir: true,
			filter: item => item.stats.isDirectory() || fileNameRegExp.test(item.path)
		});
		let imageFile;
		let imageString = 'Image not found';
		if (files.length > 0) {
			imageFile = files[0];
			imageString = `![${imageFile.path}](${imageFile.path}|height=100)`;
		}
		const hover = new Hover(new MarkdownString(imageString), new Range(position.line, startIndex + 1, position.line, endIndex));
		return hover;
	}
}

/**
 * Returns matching definitions from given files
 *
 * @param {Array} files files to search
 * @param {RegExp} regExp search pattern
 * @param {Function} callback function to return item to add to definitions array
 *
 * @returns {Array}
 */
export async function getReferences<T> (files: string[]|string, regExp: RegExp, callback: (file: string, range: Range) => T): Promise<T[]> {
	const definitions = [];
	if (!Array.isArray(files)) {
		files = [ files ];
	}
	for (const file of files) {
		let document;
		try {
			document = await workspace.openTextDocument(file);
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
				definitions.push(callback(file, new Range(position.line, position.character, position.line, 0)));
			}
		}
	}
	return definitions;
}

/**
 * Provide completion items
 *
 * @param {TextDocument} document active text document
 * @param {Position} position caret position
 * @param {Array} suggestions definition suggestions
 *
 * @returns {Thenable}
 */
export async function provideDefinition (document: TextDocument, position: Position, suggestions: DefinitionSuggestion[]): Promise<Definition|DefinitionLink[]> {
	const project = await getProject(document);
	if (!project) {
		return [];
	}
	const line = document.lineAt(position).text;
	const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
	const wordRange = document.getWordRangeAtPosition(position);
	const word = wordRange ? document.getText(wordRange) : undefined;
	const results: DefinitionLink[] = [];

	const regExp = /['"]/g;
	let startIndex = 0;
	let endIndex = position.character;

	for (let matches = regExp.exec(line); matches !== null; matches = regExp.exec(line)) {
		if (matches.index < position.character) {
			startIndex = matches.index;
		} else if (matches.index > position.character) {
			endIndex = matches.index;
			break;
		}
	}

	const value = (startIndex && endIndex) ? line.substring(startIndex + 1, endIndex) : '';

	for (const suggestion of suggestions) {
		if (suggestion.regExp.test(linePrefix)) {
			if (suggestion.definitionRegExp) {
				const suggestionFiles = await suggestion.files(project, document, word, value);
				const definitionRegExp = suggestion.definitionRegExp(word || value);
				return await getReferences<Location>(suggestionFiles, definitionRegExp, (file: string, range: Range) => {
					return new Location(Uri.file(file), range);
				});
			} else {
				const files = await suggestion.files(project, document, word, value);
				for (const file of files) {
					const link: DefinitionLink = {
						originSelectionRange: new Range(position.line, startIndex, position.line, endIndex),
						targetRange: new Range(0, 0, 0, 0),
						targetUri: Uri.file(file)
					};
					results.push(link);
				}
			}
		}
	}
	return results;
}

/**
 * Provide code actions
 *
 * @param {TextDocument} document active text document
 * @param {Range} range range of selected text
 * @param {Array} suggestions definition suggestions
 *
 * @returns {Thenable}
 */
export async function provideCodeActions(document: TextDocument, range: Range | Selection, suggestions: DefinitionSuggestion[]): Promise<Command[]> {
	const project = await getProject(document);
	if (!project) {
		return [];
	}
	const linePrefix = document.getText(new Range(range.end.line, 0, range.end.line, range.end.character));
	const wordRange = document.getWordRangeAtPosition(range.end);
	const word = wordRange ? document.getText(wordRange) : null;
	const codeActions: Command[] = [];

	if (!word || word.length === 0) {
		return codeActions;
	}

	for (const suggestion of suggestions) {
		if (suggestion.regExp.test(linePrefix)) {
			const suggestionFiles = await suggestion.files(project, document, word);
			const index = suggestionFiles.indexOf(path.join(project.filePath, 'app', 'styles', 'app.tss'));
			suggestionFiles.splice(index, 1);

			if (!suggestion.definitionRegExp || !suggestion.title) {
				continue;
			}

			const definitionRegexp = suggestion.definitionRegExp(word);
			const definitions = await getReferences(suggestionFiles, definitionRegexp, () => {
				return {};
			});
			if (!definitions?.length && suggestion.insertText) {
				const insertText = suggestion.insertText(word);
				if (!insertText) {
					continue;
				}
				for (const file of suggestionFiles) {
					codeActions.push({
						title: suggestion.title(path.parse(file).name),
						command: insertCommandId,
						arguments: [ insertText, file ]
					});
				}
			} else if (!definitions?.length && suggestion.i18nString) {
				codeActions.push({
					title: 'Generate i18n string',
					command: insertI18nStringCommandId,
					arguments: [ word, project ]
				});
			}
		}
	}
	return codeActions;
}

/**
 * Insert text to end of given file
 *
 * @param {String} text text to insert
 * @param {String} filePath file in which to insert text
 */
export async function insert (text: string, filePath: string): Promise<void> {
	const document = await workspace.openTextDocument(filePath);
	const position = new Position(document.lineCount, 0);
	if (document.lineAt(position.line - 1).text.trim().length) {
		text = `\n${text}`;
	}
	const edit = new WorkspaceEdit();
	edit.insert(Uri.file(filePath), position, text);
	workspace.applyEdit(edit);
}

/**
 * Insert i18n string to end of given file and generate file if necessary
 *
 * @param {String} text text to insert
 * @param {Project} project - The Titanium project instance
 */
export async function insertI18nString (text: string, project: Project): Promise<void> {
	const defaultLang =  ExtensionContainer.config.project.defaultI18nLanguage;
	const i18nPath = await project.getI18NPath();
	if (!i18nPath) {
		return;
	}
	const i18nStringPath = path.join(i18nPath, defaultLang, 'strings.xml');
	if (!utils.fileExists(i18nStringPath)) {
		fs.ensureDirSync(path.join(i18nPath, defaultLang));
		fs.writeFileSync(i18nStringPath, '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n</resources>');
	}
	const document = await workspace.openTextDocument(i18nStringPath);
	const insertText = `\t<string name="${text}"></string>\n`;
	const index = document.getText().indexOf('<\/resources>'); // eslint-disable-line no-useless-escape
	if (index !== -1) {
		const position = document.positionAt(index);
		const edit = new WorkspaceEdit();
		edit.insert(Uri.file(i18nStringPath), position, insertText);
		workspace.applyEdit(edit);
	}
}
