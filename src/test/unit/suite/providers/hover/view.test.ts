import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { Project } from '../../../../../project';
import { ViewHoverProvider } from '../../../../../providers/hover/viewHoverProvider';
import { getFileUri } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

const viewUri = getFileUri('views/sample.xml');
let sandbox: sinon.SinonSandbox;

describe('View hover', () => {
	const provider = new ViewHoverProvider();

	async function testCompletion(position: vscode.Position, uri = viewUri): Promise<vscode.Hover|undefined> {
		await vscode.window.showTextDocument(uri);
		const text = await vscode.workspace.openTextDocument(uri);
		return provider.provideHover(text, position);
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

	it('should provide a hover for an image', async () => {
		const position = new vscode.Position(16, 26);
		const hover: vscode.Hover = await testCompletion(position) as vscode.Hover;

		const imagePath = path.join(getCommonAlloyProjectDirectory(), 'app', 'assets', 'test.png');
		expect(hover.contents[0]).to.deep.equal(new vscode.MarkdownString(`![${imagePath}](${imagePath}|height=100)`));
	});
});
