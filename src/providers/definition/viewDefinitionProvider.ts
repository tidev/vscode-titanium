
import * as definitionProviderHelper from './definitionProviderHelper';

import { DefinitionProvider } from 'vscode';
import { viewSuggestions } from './common';

export class ViewDefinitionProvider implements DefinitionProvider {

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable}
	 */
	public provideDefinition (document, position) {
		return definitionProviderHelper.provideDefinition(document, position, viewSuggestions);
	}
}
