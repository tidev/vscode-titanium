import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { Project } from '../../../../../project';
import { ViewDefinitionProvider } from '../../../../../providers/definition/viewDefinitionProvider';
import { getFileUri } from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../../common/utils';

const viewUri = getFileUri('views/sample.xml');
let sandbox: sinon.SinonSandbox;

describe('View definition', () => {
	const provider = new ViewDefinitionProvider();

	async function testCompletion(position: vscode.Position, uri = viewUri): Promise<vscode.Definition|vscode.LocationLink[]> {
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
		const position = new vscode.Position(13, 23);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss'));
		expect(suggestions[0].range.start.line).to.equal(36);
	});

	it('should provide id definitions', async () => {
		const position = new vscode.Position(1, 26);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss'));
		expect(suggestions[0].range.start.line).to.equal(0);
	});

	it('should provide event handler definitions', async () => {
		const position = new vscode.Position(13, 42);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'sample.js'));
		expect(suggestions[0].range.start.line).to.equal(20);
	});

	// FIXME: fails because it detects "widget" as the string not "widget-test"
	it.skip('should provide widget src definitions', async () => {
		const position = new vscode.Position(14, 21);
		const suggestions: vscode.DefinitionLink[] = await testCompletion(position) as vscode.DefinitionLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'widgets', 'widget-test', 'controllers', 'widget.js'));
	});

	// FIXME: fails because it detects "existing" as the string not "existing-file"
	it.skip('should provide require src definitions', async () => {
		const position = new vscode.Position(15, 22);
		const suggestions: vscode.DefinitionLink[] = await testCompletion(position) as vscode.DefinitionLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'existing-file.js'));
	});

	// FIXME: fails because it cannot pull the "test" i18n string out correctly to construct the regex
	it.skip('should provide i18n definitions', async () => {
		const position = new vscode.Position(13, 60);
		const suggestions: vscode.DefinitionLink[] = await testCompletion(position) as vscode.DefinitionLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'existing-file.js'));
	});
});
