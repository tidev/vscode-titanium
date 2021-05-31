import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { Project } from '../../../../../project';
import { ViewCodeActionProvider } from '../../../../../providers/code-action/viewCodeActionProvider';
import { getFileUri } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

const viewUri = getFileUri('views/sample.xml');
let sandbox: sinon.SinonSandbox;

describe('View code actions', () => {
	const provider = new ViewCodeActionProvider();

	async function testCompletion(range: vscode.Range, uri = viewUri): Promise<vscode.Command[]> {
		await vscode.window.showTextDocument(uri);
		const text = await vscode.workspace.openTextDocument(uri);
		return provider.provideCodeActions(text, range);
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

	it('should provide code actions for ids', async () => {
		const range = new vscode.Range(new vscode.Position(17, 19), new vscode.Position(17, 20));
		const actions = await testCompletion(range);

		expect(actions.length).to.equal(1);
		expect(actions[0].command).to.equal('titanium.insertCodeAction');
		expect(actions[0].title).to.equal('Generate style (sample)');
		expect(actions[0].arguments).to.deep.equal([
			'\n\'#noexistid\': {\n}\n',
			path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss')
		]);
	});

	it('should provide code actions for classes', async () => {
		const range = new vscode.Range(new vscode.Position(17, 37), new vscode.Position(17, 39));
		const actions = await testCompletion(range);

		expect(actions.length).to.equal(1);
		expect(actions[0].command).to.equal('titanium.insertCodeAction');
		expect(actions[0].title).to.equal('Generate style (sample)');
		expect(actions[0].arguments).to.deep.equal([
			'\n\'.noexistclass\': {\n}\n',
			path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss')
		]);
	});

	it('should provide code actions for a tag', async () => {
		const range = new vscode.Range(new vscode.Position(17, 4), new vscode.Position(17, 6));
		const actions = await testCompletion(range);

		expect(actions.length).to.equal(1);
		expect(actions[0].command).to.equal('titanium.insertCodeAction');
		expect(actions[0].title).to.equal('Generate style (sample)');
		expect(actions[0].arguments).to.deep.equal([
			'\n\'View\': {\n}\n',
			path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss')
		]);
	});

	it('should provide code actions for event handlers', async () => {
		const range = new vscode.Range(new vscode.Position(17, 55), new vscode.Position(17, 60));
		const actions = await testCompletion(range);

		expect(actions.length).to.equal(1);
		expect(actions[0].command).to.equal('titanium.insertCodeAction');
		expect(actions[0].title).to.equal('Generate function (sample)');
		expect(actions[0].arguments).to.deep.equal([
			'\nfunction noExistFunc(e){\n}\n',
			path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'sample.js')
		]);
	});
});
