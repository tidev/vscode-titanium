
import * as path from 'path';
import * as related from '../../related';

import { TextDocument, workspace } from 'vscode';
import { ExtensionContainer } from '../../container';

export interface DefinitionSuggestion {
	regExp: RegExp;
	i18nString?: boolean;
	files (document: TextDocument, text: string, value: string): string[];
	files (document: TextDocument, text: string, value?: string): string[];
	files (document: TextDocument, text?: string, value?: string): string[];
	definitionRegExp? (text: string): RegExp;
	title? (fileName: string): string;
	insertText? (text: string): string|undefined;
}

export const viewSuggestions: DefinitionSuggestion[] = [
	{ // class
		regExp: /class=["'][\s0-9a-zA-Z-_^]*$/,
		files () {
			return getRelatedFiles('tss');
		},
		definitionRegExp (text: string) {
			return new RegExp(`["']\\.${text}["'[]`, 'g');
		},
		title (fileName: string) {
			return `Generate style (${fileName})`;
		},
		insertText (text: string) {
			let insertText = ExtensionContainer.config.codeTemplates.tssClass;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // id
		regExp: /id=["'][\s0-9a-zA-Z-_^]*$/,
		files () {
			return getRelatedFiles('tss');
		},
		definitionRegExp (text: string) {
			return new RegExp(`["']#${text}["'[]`, 'g');
		},
		title (fileName: string) {
			return `Generate style (${fileName})`;
		},
		insertText (text: string) {
			let insertText = ExtensionContainer.config.codeTemplates.tssId;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // tag
		regExp: /<[A-Z][A-Za-z]*$/,
		files () {
			return getRelatedFiles('tss');
		},
		definitionRegExp (text: string) {
			return new RegExp(`["']${text}`, 'g');
		},
		title (fileName: string) {
			return `Generate style (${fileName})`;
		},
		insertText (text: string) {
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
			return getRelatedFiles('js');
		},
		definitionRegExp (text: string) {
			return new RegExp(`function ${text}\\s*?\\(`);
		},
		title (fileName: string) {
			return `Generate function (${fileName})`;
		},
		insertText (text: string) {
			let insertText = ExtensionContainer.config.codeTemplates.jsFunction;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // widget
		regExp: /<Widget[\s0-9a-zA-Z-_^='"]*src=["']$/,
		files (document: TextDocument, text: string) {
			return [ document.fileName.replace(/app\/(.*)$/, `app/widgets/${text}/controllers/widget.js`) ];
		}
	},
	{ // require
		regExp: /<Require[\s0-9a-zA-Z-_^='"]*src=["']/,
		files (document: TextDocument, text: string) {
			return [ document.fileName.replace(/app\/(.*)$/, `app/controllers/${text}.js`) ];
		}
	}
];

function getRelatedFiles (fileType: string) {
	const relatedFiles: string[] = [];
	if (fileType === 'tss') {
		relatedFiles.push(path.join(workspace.rootPath!, 'app', 'styles', 'app.tss'));
	}
	const relatedFile = related.getTargetPath(fileType);
	if (relatedFile) {
		relatedFiles.push(relatedFile);
	}
	return relatedFiles;
}
