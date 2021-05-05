import * as definitionProviderHelper from './definitionProviderHelper';

import { HoverProvider, Position, TextDocument, Hover } from 'vscode';

export class ViewHoverProvider implements HoverProvider {

	public async provideHover (document: TextDocument, position: Position): Promise<Hover|undefined> {
		return definitionProviderHelper.provideHover(document, position);
	}
}
