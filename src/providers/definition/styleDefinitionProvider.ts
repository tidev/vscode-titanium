import * as vscode from 'vscode';
import * as related from '../../related';
import * as definitionProviderHelper from './definitionProviderHelper';

const suggestions = [
	{ // id
		regExp: /["']#[A-Za-z0-9_=[\]]+/,
		definitionRegExp (text) {
			return new RegExp(`id=["']${text.replace('#', '')}`, 'g');
		},
		files (document) {
			return [ related.getTargetPath('xml', document.fileName) ];
		}
	},
	{ // class
		regExp: /["']\.[A-Za-z0-9_=[\]]+/,
		definitionRegExp (text) {
			return new RegExp(`class=["']${text.replace('.', '')}`, 'g');
		},
		files (document) {
			return [ related.getTargetPath('xml', document.fileName) ];
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
	public provideDefinition (document, position) {
		return definitionProviderHelper.provideDefinition(document, position, suggestions);
	}
}
