import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { Project } from '../../../../../project';
import * as vscode from 'vscode';

import { ControllerCompletionItemProvider } from '../../../../../providers/completion/controllerCompletionItemProvider';
import { getFileUri, loadCompletions } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

const uri = getFileUri('controllers/sample.js');

let sandbox: sinon.SinonSandbox;

describe('Controller suggestions', () => {
	const provider = new ControllerCompletionItemProvider();
	async function testCompletion (position: vscode.Position): Promise<vscode.CompletionItem[]> {
		await vscode.window.showTextDocument(uri);
		const text = await vscode.workspace.openTextDocument(uri);
		return provider.provideCompletionItems(text, position);
	}

	beforeEach(async function () {
		this.timeout(5000);
		const completions = loadCompletions();
		sandbox = sinon.createSandbox();
		sandbox.stub(provider, 'getProject').resolves(new Project(getCommonAlloyProjectDirectory(), 'app'));
		sandbox.stub(provider, 'getCompletions').resolves(completions);
	});

	afterEach(async function () {
		this.timeout(5000);
		sandbox.restore();
	});

	describe('Ti namespace suggestions', () => {

		it('Should provide tag suggestions', async () => {
			const position = new vscode.Position(0, 3); // Ti.
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(202);

			expect(suggestions[0].label).to.equal('Ti.Proxy');
			expect(suggestions[0].insertText).to.equal('Proxy');
			expect(suggestions[0].kind).to.equal(6);

			expect(suggestions[1].label).to.equal('Ti.Module');
			expect(suggestions[1].insertText).to.equal('Module');
			expect(suggestions[1].kind).to.equal(6);

			expect(suggestions[2].label).to.equal('Ti.UI.View');
			expect(suggestions[2].insertText).to.equal('View');
			expect(suggestions[2].kind).to.equal(6);

			expect(suggestions[3].label).to.equal('Ti.API');
			expect(suggestions[3].insertText).to.equal('API');
			expect(suggestions[3].kind).to.equal(6);

		});

		it('Should provide type suggestions', async () => {
			const position = new vscode.Position(1, 5); // Ti.UI
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(148);

			expect(suggestions[0].label).to.equal('Ti.UI.View');
			expect(suggestions[0].insertText).to.equal('View');
			expect(suggestions[0].kind).to.equal(6);

			expect(suggestions[1].label).to.equal('Ti.UI.ActivityIndicator');
			expect(suggestions[1].insertText).to.equal('ActivityIndicator');
			expect(suggestions[1].kind).to.equal(6);

			expect(suggestions[2].label).to.equal('Ti.UI.ActivityIndicatorStyle');
			expect(suggestions[2].insertText).to.equal('ActivityIndicatorStyle');
			expect(suggestions[2].kind).to.equal(6);

			expect(suggestions[3].label).to.equal('Ti.UI.AlertDialog');
			expect(suggestions[3].insertText).to.equal('AlertDialog');
			expect(suggestions[3].kind).to.equal(6);

		});

		it('Should provide property suggestions', async () => {
			const position = new vscode.Position(2, 28); // Ti.UI.ActivityIndicator.rota
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(3);

			expect(suggestions[0].label).to.equal('rotation');
			expect(suggestions[0].kind).to.equal(9);

			expect(suggestions[1].label).to.equal('rotationX');
			expect(suggestions[1].kind).to.equal(9);

			expect(suggestions[2].label).to.equal('rotationY');
			expect(suggestions[2].kind).to.equal(9);

		});
	});

	describe('Alloy namespace suggestions', () => {

		it('Should provide tag suggestions', async () => {
			const position = new vscode.Position(3, 6); // Alloy.
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(16);

			expect(suggestions[0].label).to.equal('Alloy.Controller');
			expect(suggestions[0].insertText).to.equal('Controller');
			expect(suggestions[0].kind).to.equal(6);

			expect(suggestions[1].label).to.equal('Alloy');
			expect(suggestions[1].insertText).to.equal('Alloy');
			expect(suggestions[1].kind).to.equal(6);

			expect(suggestions[2].label).to.equal('Alloy.Collections');
			expect(suggestions[2].insertText).to.equal('Collections');
			expect(suggestions[2].kind).to.equal(6);

			expect(suggestions[3].label).to.equal('Alloy.Controller.UI');
			expect(suggestions[3].insertText).to.equal('UI');
			expect(suggestions[3].kind).to.equal(6);

		});

		it('Should provide type suggestions', async () => {
			const position = new vscode.Position(4, 17); // Alloy.Controller.
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(14);

			expect(suggestions[0].label).to.equal('Alloy.Controller');
			expect(suggestions[0].insertText).to.equal('Controller');
			expect(suggestions[0].kind).to.equal(6);

			expect(suggestions[1].label).to.equal('Alloy.Controller.UI');
			expect(suggestions[1].insertText).to.equal('UI');
			expect(suggestions[1].kind).to.equal(6);

		});

		it('Should provide property suggestions', async () => {
			const position = new vscode.Position(5, 20); // Alloy.Controller.add
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(2);

			expect(suggestions[0].label).to.equal('addClass');
			expect(suggestions[0].kind).to.equal(1);

			expect(suggestions[1].label).to.equal('addListener');
			expect(suggestions[1].kind).to.equal(1);
		});

		it('should provide controller suggestion', async () => {
			const position = new vscode.Position(10, 24);
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(5);

			expect(suggestions[0].label).to.equal('/existing-file');
			expect(suggestions[0].kind).to.equal(17);

			// check that only 1 ts-lookup controller exists
			const tsLookupFiles = suggestions.filter(suggestion => suggestion.label === '/ts-lookup');
			expect(tsLookupFiles.length).to.equal(1, 'ts-lookup.ts and ts-lookup.js were in the suggestions');
		});

		it('should provide model suggestion', async () => {
			const position = new vscode.Position(11, 19);
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(1);

			expect(suggestions[0].label).to.equal('/test');
			expect(suggestions[0].kind).to.equal(17);
		});

		it('should provide widget suggestion', async () => {
			const position = new vscode.Position(12, 20);
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(1);

			expect(suggestions[0].label).to.equal('widget-test');
			expect(suggestions[0].kind).to.equal(17);
		});

		it('should complete Alloy.CFG', async () => {
			const position = new vscode.Position(13, 10);
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(1);

			expect(suggestions[0].label).to.equal('test');
			expect(suggestions[0].kind).to.equal(11);
		});

		it('should provide i18n strings', async () => {
			const position = new vscode.Position(14, 3);
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(1);

			expect(suggestions[0].label).to.equal('test');
			expect(suggestions[0].kind).to.equal(17);
		});
	});

	describe('id completions', () => {
		it('Should return id completions', async () => {
			const position = new vscode.Position(6, 2); // $.
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(3);

			expect(suggestions[0].label).to.equal('container');
			expect(suggestions[0].kind).to.equal(17);

			expect(suggestions[1].label).to.equal('scrollView');
			expect(suggestions[1].kind).to.equal(17);
		});

		it('should return completions for the type of id', async () => {
			const position = new vscode.Position(7, 13); // $.scrollView.
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(272);
			expect(suggestions[0].label).to.equal('addEventListener');
			expect(suggestions[1].label).to.equal('removeEventListener');
		});
	});

	describe('event name completions', () => {
		it('Should return event name completions', async () => {
			const position = new vscode.Position(8, 31); // $.scrollView.addEventListener('')
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(22);

			expect(suggestions[0].label).to.equal('click');
			expect(suggestions[0].kind).to.equal(22);

			expect(suggestions[17].label).to.equal('scroll');
			expect(suggestions[17].kind).to.equal(22);
		});
	});

	describe('require/import completions', () => {
		it('Should return lib files for require', async () => {
			const position = new vscode.Position(9, 9);
			const suggestions: vscode.CompletionItem[] = await testCompletion(position);

			expect(suggestions.length).to.equal(1);

			expect(suggestions[0].label).to.equal('/http');
			expect(suggestions[0].kind).to.equal(17);
		});

		it('Should return lib files for import', async () => {
			const defaultPosition = new vscode.Position(31, 18);
			const defaultSuggestions: vscode.CompletionItem[] = await testCompletion(defaultPosition);

			expect(defaultSuggestions.length).to.equal(1);

			expect(defaultSuggestions[0].label).to.equal('/http');
			expect(defaultSuggestions[0].kind).to.equal(17);

			const sideEffectsPosition = new vscode.Position(32, 8);
			const sideEffectsSuggestions: vscode.CompletionItem[] = await testCompletion(sideEffectsPosition);

			expect(sideEffectsSuggestions.length).to.equal(1);

			expect(sideEffectsSuggestions[0].label).to.equal('/http');
			expect(sideEffectsSuggestions[0].kind).to.equal(17);

			const asPosition = new vscode.Position(33, 22);
			const asSuggestions: vscode.CompletionItem[] = await testCompletion(asPosition);

			expect(asSuggestions.length).to.equal(1);

			expect(asSuggestions[0].label).to.equal('/http');
			expect(asSuggestions[0].kind).to.equal(17);

			const singlePosition = new vscode.Position(34, 22);
			const singleSuggestions: vscode.CompletionItem[] = await testCompletion(singlePosition);

			expect(singleSuggestions.length).to.equal(1);

			expect(singleSuggestions[0].label).to.equal('/http');
			expect(singleSuggestions[0].kind).to.equal(17);

			const dynamicAwaitPosition = new vscode.Position(35, 27);
			const dynamicAwaitSuggestions: vscode.CompletionItem[] = await testCompletion(dynamicAwaitPosition);

			expect(dynamicAwaitSuggestions.length).to.equal(1);

			expect(dynamicAwaitSuggestions[0].label).to.equal('/http');
			expect(dynamicAwaitSuggestions[0].kind).to.equal(17);

			const dynamicThenPosition = new vscode.Position(36, 8);
			const dynamicThenSuggestions: vscode.CompletionItem[] = await testCompletion(dynamicThenPosition);

			expect(dynamicThenSuggestions.length).to.equal(1);

			expect(dynamicThenSuggestions[0].label).to.equal('/http');
			expect(dynamicThenSuggestions[0].kind).to.equal(17);

			const dynamicSideEffectsPosition = new vscode.Position(37, 14);
			const dynamicSideEffectsSuggestions: vscode.CompletionItem[] = await testCompletion(dynamicSideEffectsPosition);

			expect(dynamicSideEffectsSuggestions.length).to.equal(1);

			expect(dynamicSideEffectsSuggestions[0].label).to.equal('/http');
			expect(dynamicSideEffectsSuggestions[0].kind).to.equal(17);

		});
	});
});
