import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as path from 'path';
import { getUnitFixturesDirectory } from '../../../utils';
import { Project } from '../../../../../project';
import * as vscode from 'vscode';

import { TiappCompletionItemProvider } from '../../../../../providers/completion/tiappCompletionItemProvider';
import { getCommonAlloyProjectDirectory } from '../../../../../test/common/utils';

let sandbox: sinon.SinonSandbox;

describe('tiapp completion provider', () => {
	const provider = new TiappCompletionItemProvider();
	const uri = vscode.Uri.file(path.join(getUnitFixturesDirectory(), 'completions', 'tiapp.xml'));
	async function testCompletion (position: vscode.Position): Promise<vscode.CompletionItem[]> {
		await vscode.window.showTextDocument(uri);
		const text = await vscode.workspace.openTextDocument(uri);
		return provider.provideCompletionItems(text, position);
	}

	beforeEach(async function () {
		this.timeout(5000);

		sandbox = sinon.createSandbox();
		sandbox.stub(provider, 'getProject').resolves(new Project(getCommonAlloyProjectDirectory(), 'app'));
	});

	afterEach(async function () {
		this.timeout(5000);
		sandbox.restore();
	});

	it('should provide sdk completions', async () => {
		const position = new vscode.Position(5, 17);
		const suggestions = await testCompletion(position);

		expect(suggestions.length).to.equal(7);
		expect(suggestions[0].label).to.equal('7.0.0.v20170815160201');
	});

	it('should provide sdk completions based on existing value', async () => {
		const position = new vscode.Position(6, 19);
		const suggestions = await testCompletion(position);

		expect(suggestions.length).to.equal(4);
		expect(suggestions[0].label).to.equal('6.2.0.v20170815151205');
	});

	it('should provide module completions', async () => {
		const position = new vscode.Position(3, 16);
		const suggestions = await testCompletion(position);

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].label).to.equal('test.awesome');
		expect(suggestions[0].detail).to.equal('android');
	});
});
