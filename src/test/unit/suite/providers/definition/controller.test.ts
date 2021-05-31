import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { Project } from '../../../../../project';
import { ControllerDefinitionProvider } from '../../../../../providers/definition/controllerDefinitionProvider';
import { getFileUri } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

const controllersUri = getFileUri('controllers/sample.js');
const widgetUri = getFileUri('widgets/widget-test/controllers/widget.js');

let sandbox: sinon.SinonSandbox;

describe('Controller definition', () => {
	const provider = new ControllerDefinitionProvider();

	async function testCompletion(position: vscode.Position, uri = controllersUri): Promise<vscode.Definition|vscode.LocationLink[]> {
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

	it('should provide require definition', async () => {
		const position = new vscode.Position(15, 9);
		const suggestions: vscode.LocationLink[] = await testCompletion(position) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'lib', 'http.js')));
	});

	it('should provide controller definitions', async () => {
		const position = new vscode.Position(16, 32);
		const suggestions: vscode.LocationLink[] = await testCompletion(position) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'existing-file.js')));
	});

	it('should provide model definitions', async () => {
		const position = new vscode.Position(17, 19);
		const suggestions: vscode.LocationLink[] = await testCompletion(position) as vscode.LocationLink[];

		expect(suggestions.length).to.deep.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'models', 'test.js')));
	});
	it('should provide model definitions for Alloy.Collections', async () => {
		const position = new vscode.Position(18, 28);
		const suggestions: vscode.LocationLink[] = await testCompletion(position) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'models', 'test.js')));
	});

	it('should provide widget definitions', async () => {
		const position = new vscode.Position(19, 20);
		const suggestions: vscode.LocationLink[] = await testCompletion(position) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'widgets', 'widget-test', 'controllers', 'widget.js')));
	});

	it('should display widget controller definitions', async () => {
		const position = new vscode.Position(0, 25);
		const suggestions: vscode.LocationLink[] = await testCompletion(position, widgetUri) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'widgets', 'widget-test', 'controllers', 'test.js')));
	});

	it('should display widget Collection definitions', async () => {
		const position = new vscode.Position(1, 29);
		const suggestions: vscode.LocationLink[] = await testCompletion(position, widgetUri) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'widgets', 'widget-test', 'models', 'test.js')));
	});

	it('should display widget model definitions', async () => {
		const position = new vscode.Position(2, 20);
		const suggestions: vscode.LocationLink[] = await testCompletion(position, widgetUri) as vscode.LocationLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'widgets', 'widget-test', 'models', 'test.js')));
	});
});
