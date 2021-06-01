import { Project } from '../../project';
import * as vscode from 'vscode';
import * as related from '../../related';
import { BaseDefinitionProvider } from './baseDefinitionProvider';

export class StyleDefinitionProvider extends BaseDefinitionProvider {
	protected override suggestions = [
		{ // id
			regExp: /["']#[A-Za-z0-9_=[\]]+/,
			definitionRegExp (text: string): RegExp {
				// eslint-disable-next-line security/detect-non-literal-regexp
				return new RegExp(`id=["']${text.replace('#', '')}`, 'g');
			},
			files (project: Project, document: vscode.TextDocument): string[] {
				const relatedFile = related.getTargetPath(project, 'xml', document.fileName);
				if (relatedFile) {
					return [ relatedFile ];
				}
				return [ ];
			}
		},
		{ // class
			regExp: /["']\.[A-Za-z0-9_=[\]]+/,
			definitionRegExp (text: string): RegExp {
				// eslint-disable-next-line security/detect-non-literal-regexp
				return new RegExp(`class=["']${text.replace('.', '')}`, 'g');
			},
			files (project: Project, document: vscode.TextDocument): string[] {
				const relatedFile = related.getTargetPath(project, 'xml', document.fileName);
				if (relatedFile) {
					return [ relatedFile ];
				}
				return [ ];
			}
		}
	]
}
