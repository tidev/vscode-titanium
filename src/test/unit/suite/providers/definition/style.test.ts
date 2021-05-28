import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { Project } from '../../../../../project';
import { StyleDefinitionProvider } from '../../../../../providers/definition/styleDefinitionProvider';
import { getFileUri } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

const styleUri = getFileUri('styles/sample.tss');

let sandbox: sinon.SinonSandbox;

describe('View definition', () => {
	const provider = new StyleDefinitionProvider();

	async function testCompletion(position: vscode.Position, uri = styleUri): Promise<vscode.Definition|vscode.LocationLink[]> {
		await vscode.window.showTextDocument(uri);
		const text = await vscode.workspace.openTextDocument(uri);
		return provider.provideDefinition(text, position);
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

	it('should provide class definitions', async () => {
		const position = new vscode.Position(0, 3);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'views', 'sample.xml'));
		expect(suggestions[0].range.start.line).to.equal(1);
	});

	it('should provide id definitions', async () => {
		const position = new vscode.Position(36, 3);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'views', 'sample.xml'));
		expect(suggestions[0].range.start.line).to.equal(13);
	});
});
