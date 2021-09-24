import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { Project } from '../../../../../project';
import * as vscode from 'vscode';

import { ViewCompletionItemProvider } from '../../../../../providers/completion/viewCompletionItemProvider';
import { getFileUri, loadCompletions } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

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
		const position = new vscode.Position(2, 7);
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
		const position = new vscode.Position(2, 28); // <Window onOpen
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('onOpen');
		expect((suggestions[0].insertText as vscode.SnippetString).value).to.equal('onOpen="$1"$0');
		expect(suggestions[0].kind).to.equal(22);
	});

	it('should provide attribute suggestion', async () => {
		const position = new vscode.Position(7, 15);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(107);

		expect(suggestions[0].label).to.equal('id');
		expect(suggestions[0].kind).to.equal(9);
	});

	it('should provide attribute value suggestion', async () => {
		const position = new vscode.Position(8, 22);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(24);

		expect(suggestions[0].label).to.equal('transparent');
		expect(suggestions[0].kind).to.equal(11);

		const multiPropertyPosition = new vscode.Position(25, 34);
		const multiPropertySuggestions: vscode.CompletionItem[] = await testCompletion(multiPropertyPosition);

		expect(multiPropertySuggestions.length).to.equal(24);

		expect(multiPropertySuggestions[0].label).to.equal('transparent');
		expect(multiPropertySuggestions[0].kind).to.equal(11);
	});

	it('should provide tss class suggestions', async () => {
		const position = new vscode.Position(9, 22);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(3);

		expect(suggestions[0].label).to.equal('testClass');
		expect(suggestions[0].kind).to.equal(17);
	});

	it('should provide tss id suggestions', async () => {
		const position = new vscode.Position(10, 19);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(3);

		expect(suggestions[0].label).to.equal('container');
		expect(suggestions[0].kind).to.equal(17);

		expect(suggestions[1].label).to.equal('label');
		expect(suggestions[1].kind).to.equal(17);
	});

	it('should provide require src suggestions', async () => {
		const position = new vscode.Position(11, 22);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(4);

		expect(suggestions[0].label).to.equal('/existing-file');
		expect(suggestions[0].kind).to.equal(17);

		const multiPropertyPosition = new vscode.Position(23, 27);
		const multiPropertySuggestions: vscode.CompletionItem[] = await testCompletion(multiPropertyPosition);

		expect(multiPropertySuggestions.length).to.equal(4);

		expect(multiPropertySuggestions[0].label).to.equal('/existing-file');
		expect(multiPropertySuggestions[0].kind).to.equal(17);
	});

	it('should provide widget src suggestions', async () => {
		const position = new vscode.Position(12, 21);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('widget-test');
		expect(suggestions[0].kind).to.equal(17);

		const multiPropertyPosition = new vscode.Position(24, 26);
		const multiPropertySuggestions: vscode.CompletionItem[] = await testCompletion(multiPropertyPosition);

		expect(multiPropertySuggestions.length).to.equal(1);

		expect(multiPropertySuggestions[0].label).to.equal('widget-test');
		expect(multiPropertySuggestions[0].kind).to.equal(17);
	});

	it('should provide custom tag module suggestions', async () => {
		const position = new vscode.Position(22, 37);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('/folder/custom-view');
		expect(suggestions[0].kind).to.equal(17);
	});
});
