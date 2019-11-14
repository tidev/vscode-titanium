import * as vscode from 'vscode';
import * as related from '../../related';
import { DefinitionSuggestion } from './common';
import * as definitionProviderHelper from './definitionProviderHelper';

const suggestions: DefinitionSuggestion[] = [
	{ // id
		regExp: /["']#[A-Za-z0-9_=[\]]+/,
		definitionRegExp (text: string) {
			return new RegExp(`id=["']${text.replace('#', '')}`, 'g');
		},
		files (document: vscode.TextDocument) {
			const relatedFile = related.getTargetPath('xml', document.fileName);
			if (relatedFile) {
				return [ relatedFile ];
			}
			return [ ];
		}
	},
	{ // class
		regExp: /["']\.[A-Za-z0-9_=[\]]+/,
		definitionRegExp (text: string) {
			return new RegExp(`class=["']${text.replace('.', '')}`, 'g');
		},
		files (document: vscode.TextDocument) {
			const relatedFile = related.getTargetPath('xml', document.fileName);
			if (relatedFile) {
				return [ relatedFile ];
			}
			return [ ];
		}
	}
];

export class StyleDefinitionProvider implements vscode.DefinitionProvider {
	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable}
	 */
	public provideDefinition (document: vscode.TextDocument, position: vscode.Position) {
		return definitionProviderHelper.provideDefinition(document, position, suggestions);
	}
}
