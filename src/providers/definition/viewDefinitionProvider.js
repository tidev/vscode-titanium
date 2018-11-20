const vscode = require('vscode');
const path = require('path');
const related = require('../../related');
const definitionProviderHelper = require('./definitionProviderHelper');

/**
 * View definition provider
*/
const ViewDefinitionProvider = {

	suggestions: [
		{ // class
			regExp: /class=["'][\s0-9a-zA-Z-_^]*$/,
			files: function () {
				return [
					related.getTargetPath('tss'),
					path.join(vscode.workspace.rootPath, 'app', 'styles', 'app.tss')
				];
			},
			definitionRegExp: function (text) {
				return new RegExp(`["']\\.${text}["'[]`, 'g');
			},
			title: function (fileName) {
				return `Generate style (${fileName})`;
			},
			insertText: function (text) {
				let insertText = vscode.workspace.getConfiguration('appcelerator-titanium.codeTemplates').get('tssClass');
				insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
				return insertText;
			}
		},
		{ // id
			regExp: /id=["'][\s0-9a-zA-Z-_^]*$/,
			files: function () {
				return [
					related.getTargetPath('tss'),
					path.join(vscode.workspace.rootPath, 'app', 'styles', 'app.tss')
				];
			},
			definitionRegExp: function (text) {
				return new RegExp(`["']#${text}["'[]`, 'g');
			},
			title: function (fileName) {
				return `Generate style (${fileName})`;
			},
			insertText: function (text) {
				let insertText = vscode.workspace.getConfiguration('appcelerator-titanium.codeTemplates').get('tssId');
				insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
				return insertText;
			}
		},
		{ // tag
			regExp: /<[A-Z][A-Za-z]*$/,
			files: function () {
				return [
					related.getTargetPath('tss'),
					path.join(vscode.workspace.rootPath, 'app', 'styles', 'app.tss')
				];
			},
			definitionRegExp: function (text) {
				return new RegExp(`["']${text}`, 'g');
			},
			title: function (fileName) {
				return `Generate style (${fileName})`;
			},
			insertText: function (text) {
				if ([ 'Alloy', 'Annotation', 'Collection', 'Menu', 'Model', 'Require', 'Widget' ].indexOf(text) !== -1
					|| text.startsWith('/')) {
					return;
				}
				let insertText = vscode.workspace.getConfiguration('appcelerator-titanium.codeTemplates').get('tssTag');
				insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
				return insertText;
			}
		},
		{ // handler
			regExp: /on(.*?)=["']$/,
			files: function () {
				return [ related.getTargetPath('js') ];
			},
			definitionRegExp: function (text) {
				return new RegExp(`function ${text}\\s*?\\(`);
			},
			title: function (fileName) {
				return `Generate function (${fileName})`;
			},
			insertText: function (text) {
				let insertText = vscode.workspace.getConfiguration('appcelerator-titanium.codeTemplates').get('jsFunction');
				insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
				return insertText;
			}
		},
		{ // widget
			regExp: /<Widget[\s0-9a-zA-Z-_^='"]*src=["']$/,
			files: function (document, text) {
				return document.fileName.replace(/app\/(.*)$/, `app/widgets/${text}/controllers/widget.js`);
			}
		},
		{ // require
			regExp: /<Require[\s0-9a-zA-Z-_^='"]*src=["']$/,
			files: function (document, text) {
				return document.fileName.replace(/app\/(.*)$/, `app/controllers/${text}.js`);
			}
		}
	],

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable}
	 */
	provideDefinition(document, position) {
		return definitionProviderHelper.provideDefinition(document, position, this.suggestions);
	},

	/**
	 * Provide code actions
	 *
	 * @param {TextDocument} document active text document
	 * @param {Range} range range of selected text
	 *
	 * @returns {Thenable}
	 */
	provideCodeActions(document, range) {
		return definitionProviderHelper.provideCodeActions(document, range, this.suggestions);
	}
};

module.exports = ViewDefinitionProvider;
