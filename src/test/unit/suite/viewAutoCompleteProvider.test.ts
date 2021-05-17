import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { Project } from '../../../project';
import * as vscode from 'vscode';

import { ViewCompletionItemProvider } from '../../../providers/completion/viewCompletionItemProvider';
import { getFileUri, loadCompletions } from '../utils';
import { getCommonAlloyProjectDirectory } from '../../../test/common/utils';

const uri = getFileUri('views/sample.xml');

let sandbox: sinon.SinonSandbox;

describe('View suggestions', () => {
	const provider = new ViewCompletionItemProvider();

	async function testCompletion (position: vscode.Position): Promise<vscode.CompletionItem[]> {
		await vscode.window.showTextDocument(uri);
		const text = await vscode.workspace.openTextDocument(uri);
		return provider.provideCompletionItems(text, position);
	}
	before(async function () {
		this.timeout(5000);
		const completions = loadCompletions();
		sandbox = sinon.createSandbox();
		sandbox.stub(provider, 'getProject').resolves(new Project(getCommonAlloyProjectDirectory(), 'app'));
		sandbox.stub(provider, 'getCompletions').resolves(completions);
	});

	after(async function () {
		this.timeout(5000);
		sandbox.restore();

	});

	it('Should provide tag suggestions', async () => {
		const position = new vscode.Position(2, 11); // <Wi
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(4);

		expect(suggestions[0].label).to.equal('NavigationWindow');
		expect(suggestions[0].kind).to.equal(6);
		expect(suggestions[0].detail).to.equal('Ti.UI.NavigationWindow');

		expect(suggestions[1].label).to.equal('SplitWindow');
		expect(suggestions[1].kind).to.equal(6);
		expect(suggestions[1].detail).to.equal('Ti.UI.iOS.SplitWindow');

		expect(suggestions[2].label).to.equal('Window');
		expect(suggestions[2].kind).to.equal(6);
		expect(suggestions[2].detail).to.equal('Ti.UI.Window');

		expect(suggestions[3].label).to.equal('WindowToolbar');
		expect(suggestions[3].kind).to.equal(6);
		expect(suggestions[3].detail).to.equal('Ti.UI.Window.WindowToolbar');

	});

	it('Should provide event suggestions for', async () => {
		const position = new vscode.Position(2, 22); // <Window onOpen
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('onOpen');
		expect((suggestions[0].insertText as vscode.SnippetString).value).to.equal('onOpen="$1"$0');
		expect(suggestions[0].kind).to.equal(22);

	});
});
