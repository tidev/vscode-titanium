
import * as path from 'path';
import * as related from '../../related';

import { workspace } from 'vscode';
import { ExtensionContainer } from '../../container';

export const viewSuggestions = [
	{ // class
		regExp: /class=["'][\s0-9a-zA-Z-_^]*$/,
		files () {
			return [
				related.getTargetPath('tss'),
				path.join(workspace.rootPath, 'app', 'styles', 'app.tss')
			];
		},
		definitionRegExp (text) {
			return new RegExp(`["']\\.${text}["'[]`, 'g');
		},
		title (fileName) {
			return `Generate style (${fileName})`;
		},
		insertText (text) {
			let insertText = ExtensionContainer.config.codeTemplates.tssClass;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // id
		regExp: /id=["'][\s0-9a-zA-Z-_^]*$/,
		files () {
			return [
				related.getTargetPath('tss'),
				path.join(workspace.rootPath, 'app', 'styles', 'app.tss')
			];
		},
		definitionRegExp (text) {
			return new RegExp(`["']#${text}["'[]`, 'g');
		},
		title (fileName) {
			return `Generate style (${fileName})`;
		},
		insertText (text) {
			let insertText = ExtensionContainer.config.codeTemplates.tssId;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // tag
		regExp: /<[A-Z][A-Za-z]*$/,
		files () {
			return [
				related.getTargetPath('tss'),
				path.join(workspace.rootPath, 'app', 'styles', 'app.tss')
			];
		},
		definitionRegExp (text) {
			return new RegExp(`["']${text}`, 'g');
		},
		title (fileName) {
			return `Generate style (${fileName})`;
		},
		insertText (text) {
			if ([ 'Alloy', 'Annotation', 'Collection', 'Menu', 'Model', 'Require', 'Widget' ].indexOf(text) !== -1
				|| text.startsWith('/')) {
				return;
			}
			let insertText = ExtensionContainer.config.codeTemplates.tssTag;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // handler
		regExp: /on(.*?)=["'][A-Za-z]*$/,
		files () {
			return [ related.getTargetPath('js') ];
		},
		definitionRegExp (text) {
			return new RegExp(`function ${text}\\s*?\\(`);
		},
		title (fileName) {
			return `Generate function (${fileName})`;
		},
		insertText (text) {
			let insertText = ExtensionContainer.config.codeTemplates.jsFunction;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // widget
		regExp: /<Widget[\s0-9a-zA-Z-_^='"]*src=["']$/,
		files (document, text) {
			return document.fileName.replace(/app\/(.*)$/, `app/widgets/${text}/controllers/widget.js`);
		}
	},
	{ // require
		regExp: /<Require[\s0-9a-zA-Z-_^='"]*src=["']$/,
		files (document, text) {
			return document.fileName.replace(/app\/(.*)$/, `app/controllers/${text}.js`);
		}
	}
];
