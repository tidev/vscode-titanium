import * as definitionProviderHelper from './definitionProviderHelper';

import { HoverProvider, Position, TextDocument, Hover } from 'vscode';

export class ViewHoverProvider implements HoverProvider {

	public provideHover (document: TextDocument, position: Position): Hover|undefined {
		return definitionProviderHelper.provideHover(document, position);
	}
}
