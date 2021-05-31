/* eslint no-template-curly-in-string: off */
import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { Project } from '../../../../../project';
import * as vscode from 'vscode';

import { StyleCompletionItemProvider } from '../../../../../providers/completion/styleCompletionItemProvider';
import { getFileUri, loadCompletions } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../../test/common/utils';

const uri = getFileUri('styles/sample.tss');

let sandbox: sinon.SinonSandbox;
describe('TSS Suggestions', () => {
	const provider = new StyleCompletionItemProvider();
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
		const position = new vscode.Position(17, 1); // "W
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(29);

		expect(suggestions[0].label).to.equal('ActionView');
		expect(suggestions[0].detail).to.equal('_ProxyProperty.ActionView');
		expect(suggestions[0].insertText).to.be.an.instanceOf(vscode.SnippetString);
		expect((suggestions[0].insertText as vscode.SnippetString).value).to.equal('ActionView": {\n\t${1}\t\n}');

		expect(suggestions[1].label).to.equal('AndroidView');
		expect(suggestions[1].detail).to.equal('Ti.UI.AndroidView');
		expect((suggestions[1].insertText as vscode.SnippetString).value).to.equal('AndroidView": {\n\t${1}\t\n}');

		expect(suggestions[2].label).to.equal('CardView');
		expect(suggestions[2].detail).to.equal('Ti.UI.Android.CardView');
		expect((suggestions[2].insertText as vscode.SnippetString).value).to.equal('CardView": {\n\t${1}\t\n}');

		expect(suggestions[3].label).to.equal('CenterView');
		expect(suggestions[3].detail).to.equal('Ti.UI.Android.DrawerLayout.CenterView');
		expect((suggestions[3].insertText as vscode.SnippetString).value).to.equal('CenterView": {\n\t${1}\t\n}');
	});

	it('Should provide property name suggestions', async () => {
		const position = new vscode.Position(20, 8); // scroll
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(14);

		expect(suggestions[0].label).to.equal('autoAdjustScrollViewInsets');
		expect(suggestions[0].kind).to.equal(9);
		expect(suggestions[0].insertText).to.equal('autoAdjustScrollViewInsets: ');

		expect(suggestions[1].label).to.equal('canScroll');
		expect(suggestions[1].kind).to.equal(9);
		expect(suggestions[1].insertText).to.equal('canScroll: ');

		expect(suggestions[2].label).to.equal('fastScroll');
		expect(suggestions[2].kind).to.equal(9);
		expect(suggestions[2].insertText).to.equal('fastScroll: ');

		expect(suggestions[3].label).to.equal('hidesSearchBarWhenScrolling');
		expect(suggestions[3].kind).to.equal(9);
		expect(suggestions[3].insertText).to.equal('hidesSearchBarWhenScrolling: ');
	});

	it('Should provide property value suggestions if Position is  at colon', async () => {
		const position = new vscode.Position(14, 16); // separatorStyle:^
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('Ti.UI.TABLE_VIEW_SEPARATOR_STYLE_NONE');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('Ti.UI.TABLE_VIEW_SEPARATOR_STYLE_SINGLE_LINE');
		expect(suggestions[1].kind).to.equal(11);
	});

	it('Should not provide property value suggestions if Position is in property', async () => {
		const position = new vscode.Position(14, 15); // separatorStyl^e:
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(0);
	});

	it('should provide color values with quotes', async () => {
		const position = new vscode.Position(7, 10); // color: "ma"
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('\'magenta\'');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('\'maroon\'');
		expect(suggestions[1].kind).to.equal(11);
	});

	it('should provide color values without quotes', async () => {
		const position = new vscode.Position(1, 19); // backgroundColor: ma
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('\'magenta\'');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('\'maroon\'');
		expect(suggestions[1].kind).to.equal(11);
	});

	it('should provide layout values', async () => {
		const position = new vscode.Position(21, 9); // layout:
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(3);

		expect(suggestions[0].label).to.equal('\'vertical\'');
		expect(suggestions[0].kind).to.equal(11);

		expect(suggestions[1].label).to.equal('\'horizontal\'');
		expect(suggestions[1].kind).to.equal(11);

		expect(suggestions[2].label).to.equal('\'composite\'');
		expect(suggestions[2].kind).to.equal(11);
	});

	it('should provide class completions', async () => {
		const position = new vscode.Position(24, 3);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('foo');
		expect(suggestions[0].kind).to.equal(17);
	});

	it('should provide id completions', async () => {
		const position = new vscode.Position(26, 3);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(2);

		expect(suggestions[0].label).to.equal('scrollView');
		expect(suggestions[0].kind).to.equal(17);
	});

	it('should provide i18n completions',  async () => {
		const position = new vscode.Position(29, 13);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('test');
		expect(suggestions[0].kind).to.equal(17);
	});

	it('should provide image completions', async () => {
		const position = new vscode.Position(33, 12);
		const suggestions: vscode.CompletionItem[] = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('/test.png');
		expect(suggestions[0].kind).to.equal(16);
	});
});
