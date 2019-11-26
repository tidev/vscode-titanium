
import * as definitionProviderHelper from './definitionProviderHelper';

import { DefinitionProvider, Position, TextDocument, Definition, DefinitionLink } from 'vscode';
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
	public provideDefinition (document: TextDocument, position: Position): Promise<Definition|DefinitionLink[]>  {
		return definitionProviderHelper.provideDefinition(document, position, viewSuggestions);
	}
}
