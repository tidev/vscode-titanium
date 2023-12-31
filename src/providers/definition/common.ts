import * as path from 'path';
import * as related from '../../related';
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

export async function getRelatedFiles(project: Project, fileType: string, includeAppTss = true): Promise<string[]> {
	const relatedFiles: string[] = [];
	if (fileType === 'tss' && includeAppTss) {
		relatedFiles.push(path.join(project.filePath, 'app', 'styles', 'app.tss'));
	}
	const relatedFile = await related.getTargetPath(project, fileType);
	if (relatedFile) {
		relatedFiles.push(relatedFile);
	}
	return relatedFiles;
}

export const viewSuggestions: DefinitionSuggestion[] = [
	{ // class
		regExp: /class=["'][\s0-9a-zA-Z-_^]*$/,
		async files (project: Project): Promise<string[]> {
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
			// eslint-disable-next-line no-template-curly-in-string
			let insertText = ExtensionContainer.config?.codeTemplates?.tssClass || '\\n\'.${text}\': {\\n}\\n';
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // id
		regExp: /id=["'][\s0-9a-zA-Z-_^]*$/,
		async files (project: Project): Promise<string[]> {
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
			// eslint-disable-next-line no-template-curly-in-string
			let insertText = ExtensionContainer.config?.codeTemplates?.tssId || '\\n\'#${text}\': {\\n}\\n';
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // tag
		regExp: /<[A-Z][A-Za-z]*$/,
		async files (project: Project): Promise<string[]> {
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
			// eslint-disable-next-line no-template-curly-in-string
			let insertText = ExtensionContainer.config?.codeTemplates?.tssTag || '\\n\'${text}\': {\\n}\\n';
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // handler
		regExp: /on(.*?)=["'][A-Za-z]*$/,
		async files (project: Project): Promise<string[]> {
			return getRelatedFiles(project, 'js');
		},
		definitionRegExp (text: string): RegExp {
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`(?:function ${text}\\s*?\\(|(?:var|let|const)\\s*?${text}\\s*?=\\s*?\\()`);
		},
		title (fileName: string): string {
			return `Generate function (${fileName})`;
		},
		insertText (text: string): string {
			// eslint-disable-next-line no-template-curly-in-string
			let insertText = ExtensionContainer.config?.codeTemplates?.jsFunction || '\\nfunction ${text}(e){\\n}\\n';
			insertText = insertText.replace(/(\${text})/g, text).replace(/\\n/g, '\n');
			return insertText;
		}
	},
	{ // widget
		regExp: /<Widget[\s0-9a-zA-Z-_^='"]*src=["']/,
		files (project: Project, document: TextDocument, text: string): string[] {
			return [ path.join(project.filePath, 'app', 'widgets', text, 'controllers', 'widget.js') ];
		}
	},
	{ // require
		regExp: /<Require[\s0-9a-zA-Z-_^='"]*src=["']/,
		files (project: Project, document: TextDocument, text: string): string[] {
			return [ path.join(project.filePath, 'app', 'controllers', `${text}.js`) ];
		}
	},
	{ // i18n
		regExp: /[:\s=,>)("]L\(["'][\w0-9_-]*/,
		definitionRegExp(text: string): RegExp {
			// Strip the brackets if they're included
			if (text.includes('(')) {
				const matches = /\(["'](\S+)["']\)/.exec(text);
				text = matches?.[1] as string;

			}
			// eslint-disable-next-line security/detect-non-literal-regexp
			return new RegExp(`name=["']${text}["']>.*</`, 'g');
		},
		async files(project: Project): Promise<string[]> {
			const i18nPath = await project.getI18NPath();
			if (!i18nPath) {
				return [];
			}
			const defaultLang = ExtensionContainer.config?.project?.defaultI18nLanguage || 'en';
			return [ path.join(i18nPath, defaultLang, 'strings.xml') ];
		},
		i18nString: true
	},
	{ // custom tags
		regExp: /<\w+[\s0-9a-zA-Z-_^='"]*module=["']/,
		files (project: Project, document: TextDocument, text: string): string[] {
			return [ path.join(project.filePath, 'app', 'lib', `${text}.js`) ];
		}
	}
];
