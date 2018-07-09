const vscode = require('vscode');
const fs = require('fs-extra');
const path = require('path');
const find = require('find');
const utils = require('../utils');
const mkdirp = require('mkdirp');

/**
 * Definition provider helper
 *
 * note behaviour with multiple defintions: https://github.com/Microsoft/vscode/issues/31046
*/
const DefinitionProviderHelper = {

	insertCommandId: 'appcelerator-titanium.insertCodeAction',
	insertI18nStringCommandId: 'appcelerator-titanium.insertI18nStringCodeAction',

	suggestions: [
		{ // i18n
			regExp: /[:\s=,>)("]L\(["'][\w0-9_-]*$/,
			definitionRegExp: function (text) {
				return new RegExp(`name=["']${text}["']>(.*)?</`, 'g');
			},
			files: function () {
				return [ path.join(utils.getI18nPath(), vscode.workspace.getConfiguration('appcelerator-titanium.project').get('defaultI18nLanguage'), 'strings.xml') ];
			},
			i18nString: true
		}
	],

	/**
	 * Register insert text command
	 *
	 * @param {Array} subscriptions disposables
	 */
	activate(subscriptions) {
		subscriptions.push(vscode.commands.registerCommand(this.insertCommandId, this.insert, this));
		subscriptions.push(vscode.commands.registerCommand(this.insertI18nStringCommandId, this.insertI18nString, this));
	},

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
	provideHover(document, position) {
		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
		// const wordRange = document.getWordRangeAtPosition(position);
		// const word = wordRange ? document.getText(wordRange) : null;

		let regExp = /['"]/g;
		let matches;
		let startIndex;
		let endIndex;
		while ((matches = regExp.exec(line)) !== null) {
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

		// console.log(`line: ${line}`);
		// console.log(`word: ${word}`);
		// console.log(`value: ${value}`);

		if (/image\s*=\s*["'][\s0-9a-zA-Z-_^./]*$/.test(linePrefix)) {
			const relativePath = path.parse(value);
			const dir = path.join(utils.getAlloyRootPath(), 'assets');// , path.dirname(value));
			const files = find.fileSync(new RegExp(`${relativePath.name}.*${relativePath.ext}$`), dir);
			let imageFile;
			let string = 'Image not found';
			if (files.length > 0) {
				imageFile = files[0];
				string = `![${imageFile}](${imageFile}|height=100)`;
			}
			const hover = new vscode.Hover(new vscode.MarkdownString(string), new vscode.Range(position.line, startIndex + 1, position.line, endIndex));
			return hover;
		}
	},

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 * @param {Array} suggestions definition suggestions
	 *
	 * @returns {Thenable}
	 */
	provideDefinition(document, position, suggestions) {
		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
		const wordRange = document.getWordRangeAtPosition(position);
		const word = wordRange ? document.getText(wordRange) : null;

		let regExp = /['"]/g;
		let matches;
		let startIndex;
		let endIndex;
		while ((matches = regExp.exec(line)) !== null) {
			if (matches.index < position.character) {
				startIndex = matches.index;
			} else if (matches.index > position.character) {
				endIndex = matches.index;
				break;
			}
		}

		const value = (startIndex && endIndex) ? line.substring(startIndex + 1, endIndex) : '';

		// console.log(`line: ${line}`);
		// console.log(`word: ${word}`);
		// console.log(`value: ${value}`);

		suggestions = suggestions.concat(this.suggestions);

		for (const suggestion of suggestions) {
			if (suggestion.regExp.test(linePrefix)) {
				if (suggestion.definitionRegExp) {
					return this.getReferences(suggestion.files(document, word, value), suggestion.definitionRegExp(word, value), (file, range) => {
						return new vscode.Location(vscode.Uri.file(file), range);
					});
				} else {
					return [ new vscode.Location(vscode.Uri.file(suggestion.files(document, word, value)[0]), new vscode.Range(0, 0, 0, 0)) ];
				}
			}
		}
	},

	/**
	 * Provide code actions
	 *
	 * @param {TextDocument} document active text document
	 * @param {Range} range range of selected text
	 * @param {Array} suggestions definition suggestions
	 *
	 * @returns {Thenable}
	 */
	provideCodeActions(document, range, suggestions) {
		const linePrefix = document.getText(new vscode.Range(range.end.line, 0, range.end.line, range.end.character));
		const wordRange = document.getWordRangeAtPosition(range.end);
		const word = wordRange ? document.getText(wordRange) : null;
		// const word = range ? document.getText(range) : null;
		// console.log(linePrefix + ' ' + word);

		if (!word || word.length === 0) {
			return;
		}

		suggestions = suggestions.concat(this.suggestions);

		return new Promise((resolve) => {
			for (const suggestion of suggestions) {
				if (suggestion.regExp.test(linePrefix)) {
					const suggestionsRegex = suggestion.definitionRegExp(word);
					this.getReferences(suggestion.files(document, word), suggestionsRegex, () => {
						return {};
					})
						.then(definitions => {
							const codeActions = [];
							if ((!definitions || definitions.length === 0) && suggestion.insertText) {
								const insertText = suggestion.insertText(word);
								if (insertText) {
									suggestion.files(document, word).forEach(file => {
										codeActions.push({
											title: suggestion.title(path.parse(file).name),
											command: DefinitionProviderHelper.insertCommandId,
											arguments: [ insertText, file ]
										});
									});
								}
								resolve(codeActions);
							} else if ((!definitions || definitions.length === 0) && suggestion.i18nString) {
								codeActions.push({
									title: 'Generate i18n string',
									command: DefinitionProviderHelper.insertI18nStringCommandId,
									arguments: [ word ]
								});
								resolve(codeActions);
							} else {
								resolve([]);
							}
						});
				}
			}
		});
	},

	/**
	 * Returns matching definitions from given files
	 *
	 * @param {Array} files files to search
	 * @param {RegExp} regExp search pattern
	 * @param {Function} callback function to return item to add to definitions array
	 *
	 * @returns {Array}
	 */
	getReferences(files, regExp, callback) {
		return new Promise((resolve) => {
			const definitions = [];
			const searches = [];
			files.forEach(file => {
				searches.push(new Promise((resolve, reject) => {
					vscode.workspace.openTextDocument(file).then(document => {
						if (document.getText().length > 0) {
							let matches;
							while ((matches = regExp.exec(document.getText())) !== null) {
								const position = document.positionAt(matches.index);
								definitions.push(callback(file, new vscode.Range(position.line, position.character, position.line, 0)));
							}
						}
						resolve();
					}, () => {
						reject();
					});
				}));
			});

			Promise.all(searches).then(() => {
				resolve(definitions);
			}, () => {
				resolve([]);
			});
		});
	},

	/**
	 * Insert text to end of given file
	 *
	 * @param {String} text text to insert
	 * @param {String} filePath file in which to insert text
	 */
	insert(text, filePath) {
		vscode.workspace.openTextDocument(filePath).then(document => {
			let position = new vscode.Position(document.lineCount, 0);
			if (document.lineAt(position.line - 1).text.trim().length) {
				text = `\n${text}`;
			}
			const edit = new vscode.WorkspaceEdit();
			edit.insert(vscode.Uri.file(filePath), position, text);
			vscode.workspace.applyEdit(edit);
		});
	},

	/**
	 * Insert i18n string to end of given file and generate file if necessary
	 *
	 * @param {String} text text to insert
	 */
	insertI18nString(text) {
		const defaultLang = vscode.workspace.getConfiguration('appcelerator-titanium.project').get('defaultI18nLanguage');
		const i18nStringPath = path.join(utils.getI18nPath(), defaultLang, 'strings.xml');
		if (!utils.fileExists(i18nStringPath)) {
			mkdirp.sync(path.join(utils.getI18nPath(), defaultLang));
			fs.writeFileSync(i18nStringPath, '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n</resources>');
		}
		vscode.workspace.openTextDocument(i18nStringPath).then(document => {
			const insertText = `\t<string name="${text}"></string>\n`;
			const index = document.getText().indexOf('<\/resources>'); // eslint-disable-line no-useless-escape
			if (index !== -1) {
				const position = document.positionAt(index);
				const edit = new vscode.WorkspaceEdit();
				edit.insert(vscode.Uri.file(i18nStringPath), position, insertText);
				vscode.workspace.applyEdit(edit);
			}
		});
	}

};

module.exports = DefinitionProviderHelper;
