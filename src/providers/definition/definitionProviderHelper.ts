import * as fs from 'fs-extra';
import * as walkSync from 'klaw-sync';
import * as path from 'path';
import * as utils from '../../utils';

import { commands, DefinitionLink, Hover, Location, MarkdownString, Position, Range, Uri, workspace, WorkspaceEdit } from 'vscode';
import { ExtensionContainer } from '../../container';

/**
 * Definition provider helper
 *
 * note behaviour with multiple defintions: https://github.com/Microsoft/vscode/issues/31046
 */

export const insertCommandId = 'titanium.insertCodeAction';
export const insertI18nStringCommandId = 'titanium.insertI18nStringCodeAction';

const i18nSuggestions = [
	{ // i18n
		regExp: /[:\s=,>)("]L\(["'][\w0-9_-]*$/,
		definitionRegExp (text) {
			return new RegExp(`name=["']${text}["']>(.*)?</`, 'g');
		},
		files () {
			return [ path.join(utils.getI18nPath(), ExtensionContainer.config.project.defaultI18nLanguage, 'strings.xml') ];
		},
		i18nString: true
	}
];

// 	/**
// 	 * Register insert text command
// 	 *
// 	 * @param {Array} subscriptions disposables
// 	 */
// exportactivate (subscriptions) {
// 		subscriptions.push(commands.registerCommand(this.insertCommandId, this.insert, this));
// 		subscriptions.push(commands.registerCommand(this.insertI18nStringCommandId, this.insertI18nString, this));
// 	},

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
export function provideHover (document, position) {
	const line = document.lineAt(position).text;
	const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
	// const wordRange = document.getWordRangeAtPosition(position);
	// const word = wordRange ? document.getText(wordRange) : null;

	const regExp = /['"]/g;
	let startIndex;
	let endIndex;

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
		const dir = path.join(utils.getAlloyRootPath(), 'assets');
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
 * Provide completion items
 *
 * @param {TextDocument} document active text document
 * @param {Position} position caret position
 * @param {Array} suggestions definition suggestions
 *
 * @returns {Thenable}
 */
export async function provideDefinition (document, position, suggestions) {
	const line = document.lineAt(position).text;
	const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
	const wordRange = document.getWordRangeAtPosition(position);
	const word = wordRange ? document.getText(wordRange) : null;

	const regExp = /['"]/g;
	let startIndex;
	let endIndex;

	for (let matches = regExp.exec(line); matches !== null; matches = regExp.exec(line)) {
		if (matches.index < position.character) {
			startIndex = matches.index;
		} else if (matches.index > position.character) {
			endIndex = matches.index;
			break;
		}
	}

	const value = (startIndex && endIndex) ? line.substring(startIndex + 1, endIndex) : '';

	suggestions = suggestions.concat(this.suggestions);

	for (const suggestion of suggestions) {
		if (suggestion.regExp.test(linePrefix)) {
			if (suggestion.definitionRegExp) {
				return await getReferences(suggestion.files(document, word, value), suggestion.definitionRegExp(word, value), (file, range) => {
					return new Location(Uri.file(file), range);
				});
			} else {
				const results: DefinitionLink[] = [];
				const files = suggestion.files(document, word, value);
				for (const file of files) {
					const link: DefinitionLink = {
						originSelectionRange: new Range(position.line, startIndex, position.line, endIndex),
						targetRange: new Range(0, 0, 0, 0),
						targetUri: Uri.file(file)
					};
					results.push(link);
				}
				return results;
			}
		}
	}
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
export async function provideCodeActions (document, range, suggestions) {
	const linePrefix = document.getText(new Range(range.end.line, 0, range.end.line, range.end.character));
	const wordRange = document.getWordRangeAtPosition(range.end);
	const word = wordRange ? document.getText(wordRange) : null;
	// const word = range ? document.getText(range) : null;
	// console.log(linePrefix + ' ' + word);

	if (!word || word.length === 0) {
		return;
	}

	suggestions = suggestions.concat(this.suggestions);
	const codeActions = [];
	for (const suggestion of suggestions) {
		if (suggestion.regExp.test(linePrefix)) {
			const suggestionsRegex = suggestion.definitionRegExp(word);
			const definitions = await getReferences(suggestion.files(document, word), suggestionsRegex, () => {
				return {};
			});
			if ((!definitions || definitions.length === 0) && suggestion.insertText) {
				const insertText = suggestion.insertText(word);
				if (insertText) {
					suggestion.files(document, word).forEach(file => {
						codeActions.push({
							title: suggestion.title(path.parse(file).name),
							command: insertCommandId,
							arguments: [ insertText, file ]
						});
					});
				}
			} else if ((!definitions || definitions.length === 0) && suggestion.i18nString) {
				codeActions.push({
					title: 'Generate i18n string',
					command: insertI18nStringCommandId,
					arguments: [ word ]
				});
			}
		}
	}
	return codeActions;
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
export async function getReferences (files, regExp?: RegExp, callback?: any) {
	const definitions = [];
	const searches = [];
	for (const file of files ) {
		let document;
		try {
			document = await workspace.openTextDocument(file);
		} catch (error) {
			// ignore the error, it's most likelty the file doesn't exist
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
 * Insert text to end of given file
 *
 * @param {String} text text to insert
 * @param {String} filePath file in which to insert text
 */
export function insert (text, filePath) {
	workspace.openTextDocument(filePath).then(document => {
		const position = new Position(document.lineCount, 0);
		if (document.lineAt(position.line - 1).text.trim().length) {
			text = `\n${text}`;
		}
		const edit = new WorkspaceEdit();
		edit.insert(Uri.file(filePath), position, text);
		workspace.applyEdit(edit);
	});
}

/**
 * Insert i18n string to end of given file and generate file if necessary
 *
 * @param {String} text text to insert
 */
export function insertI18nString (text) {
	const defaultLang =  ExtensionContainer.config.project.defaultI18nLanguage;
	const i18nStringPath = path.join(utils.getI18nPath(), defaultLang, 'strings.xml');
	if (!utils.fileExists(i18nStringPath)) {
		fs.ensureDirSync(path.join(utils.getI18nPath(), defaultLang));
		fs.writeFileSync(i18nStringPath, '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n</resources>');
	}
	workspace.openTextDocument(i18nStringPath).then(document => {
		const insertText = `\t<string name="${text}"></string>\n`;
		const index = document.getText().indexOf('<\/resources>'); // eslint-disable-line no-useless-escape
		if (index !== -1) {
			const position = document.positionAt(index);
			const edit = new WorkspaceEdit();
			edit.insert(Uri.file(i18nStringPath), position, insertText);
			workspace.applyEdit(edit);
		}
	});
}
