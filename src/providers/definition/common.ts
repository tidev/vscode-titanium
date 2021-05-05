import * as path from 'path';
import * as related from '../../related';
import * as utils from '../../utils';

import { TextDocument } from 'vscode';
import { ExtensionContainer } from '../../container';
import { Project } from '../../project';

export interface DefinitionSuggestion {
	regExp: RegExp;
	i18nString?: boolean;
	files (project: Project, document: TextDocument, text?: string, value?: string): Promise<string[]>|string[];
	definitionRegExp? (text: string): RegExp;
	title? (fileName: string): string;
	insertText? (text: string): string|undefined;
}

function getRelatedFiles(project: Project, fileType: string): string[] {
	const relatedFiles: string[] = [];
	if (fileType === 'tss') {
		relatedFiles.push(path.join(project.filePath, 'app', 'styles', 'app.tss'));
	}
	const relatedFile = related.getTargetPath(project, fileType);
	if (relatedFile) {
		relatedFiles.push(relatedFile);
	}
	return relatedFiles;
}

export const viewSuggestions: DefinitionSuggestion[] = [
	{ // class
		regExp: /class=["'][\s0-9a-zA-Z-_^]*$/,
		files (project: Project): string[] {
			return getRelatedFiles(project, 'tss');
		},
		definitionRegExp (text: string): RegExp {
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`["']\\.${text}["'[]`, 'g');
		},
		title (fileName: string): string {
			return `Generate style (${fileName})`;
		},
		insertText (text: string): string {
			let insertText = ExtensionContainer.config.codeTemplates.tssClass;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // id
		regExp: /id=["'][\s0-9a-zA-Z-_^]*$/,
		files (project: Project): string[] {
			return getRelatedFiles(project, 'tss');
		},
		definitionRegExp (text: string): RegExp {
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`["']#${text}["'[]`, 'g');
		},
		title (fileName: string): string {
			return `Generate style (${fileName})`;
		},
		insertText (text: string): string {
			let insertText = ExtensionContainer.config.codeTemplates.tssId;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // tag
		regExp: /<[A-Z][A-Za-z]*$/,
		files (project: Project): string[] {
			return getRelatedFiles(project, 'tss');
		},
		definitionRegExp (text: string): RegExp {
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`["']${text}`, 'g');
		},
		title (fileName: string): string {
			return `Generate style (${fileName})`;
		},
		insertText (text: string): string|undefined {
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
		files (project: Project): string[] {
			return getRelatedFiles(project, 'js');
		},
		definitionRegExp (text: string): RegExp {
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`function ${text}\\s*?\\(`);
		},
		title (fileName: string): string {
			return `Generate function (${fileName})`;
		},
		insertText (text: string): string {
			let insertText = ExtensionContainer.config.codeTemplates.jsFunction;
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // widget
		regExp: /<Widget[\s0-9a-zA-Z-_^='"]*src=["']$/,
		files (project: Project, document: TextDocument, text: string): string[] {
			return [ document.fileName.replace(/app\/(.*)$/, `app/widgets/${text}/controllers/widget.js`) ];
		}
	},
	{ // require
		regExp: /<Require[\s0-9a-zA-Z-_^='"]*src=["']/,
		files (project: Project, document: TextDocument, text: string): string[] {
			return [ document.fileName.replace(/app\/(.*)$/, `app/controllers/${text}.js`) ];
		}
	},
	{ // i18n
		regExp: /[:\s=,>)("]L\(["'][\w0-9_-]*$/,
		definitionRegExp(text: string): RegExp {
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`name=["']${text}["']>(.*)?</`, 'g');
		},
		async files(project: Project): Promise<string[]> {
			const i18nPath = await project.getI18NPath();
			if (!i18nPath) {
				return [];
			}
			return [ path.join(i18nPath, ExtensionContainer.config.project.defaultI18nLanguage, 'strings.xml') ];
		},
		i18nString: true
	}
];

export async function getProject (document: TextDocument): Promise<Project|undefined> {
	const filePath = document.uri.fsPath;
	const projectDir = await utils.findProjectDirectory(filePath);
	return ExtensionContainer.projects.get(projectDir);
}
