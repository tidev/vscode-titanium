import * as definitionProviderHelper from './definitionProviderHelper';

import { CancellationToken, HoverProvider, Position, TextDocument } from 'vscode';

export class ViewHoverProvider implements HoverProvider {

	public provideHover (document: TextDocument, position: Position, token: CancellationToken) {
		return definitionProviderHelper.provideHover(document, position);
	}
}
