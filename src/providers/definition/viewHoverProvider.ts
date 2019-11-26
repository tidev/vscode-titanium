import * as definitionProviderHelper from './definitionProviderHelper';

import { CancellationToken, HoverProvider, Position, TextDocument, Hover } from 'vscode';

export class ViewHoverProvider implements HoverProvider {

	public provideHover (document: TextDocument, position: Position, token: CancellationToken): Hover|undefined {
		return definitionProviderHelper.provideHover(document, position);
	}
}
