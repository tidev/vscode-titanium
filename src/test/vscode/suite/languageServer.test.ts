import { expect } from 'chai';
import * as vscode from 'vscode';

import { getFileUri } from '../utils';

describe('The language server', () => {

	before(async function () {
		// the client starts while the extension activates, so activation finishing is the server
		// having answered initialize
		this.timeout(30000);
		await vscode.extensions.getExtension('TiDev.titanium-sdk')?.activate();
	});

	it('should answer hover in a view', async function () {
		this.timeout(15000);
		const uri = getFileUri('views/sample.xml');
		await vscode.window.showTextDocument(uri);

		// <Alloy> is Alloy's own markup, which only the server describes
		const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, new vscode.Position(0, 2));

		const text = hovers.flatMap(hover => hover.contents).map(content => (typeof content === 'string' ? content : content.value)).join('\n');
		expect(text).to.include('The root of every view');
	});
});
