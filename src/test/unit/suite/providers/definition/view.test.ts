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

		const secondPosition = new vscode.Position(19, 33);
		const secondSuggestions: vscode.Location[] = await testCompletion(secondPosition) as vscode.Location[];

		expect(secondSuggestions.length).to.equal(1);
		expect(secondSuggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss'));
		expect(secondSuggestions[0].range.start.line).to.equal(47);

		const thirdPosition = new vscode.Position(19, 47);
		const thirdSuggestions: vscode.Location[] = await testCompletion(thirdPosition) as vscode.Location[];

		expect(thirdSuggestions.length).to.equal(1);
		expect(thirdSuggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'app.tss'));
		expect(thirdSuggestions[0].range.start.line).to.equal(27);
	});

	it('should provide id definitions', async () => {
		const position = new vscode.Position(1, 23);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'styles', 'sample.tss'));
		expect(suggestions[0].range.start.line).to.equal(0);
	});

	it('should provide event handler definitions', async () => {
		// Test function declaration
		const position = new vscode.Position(13, 42);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'sample.js'));
		expect(suggestions[0].range.start.line).to.equal(20);

		// Test variable declaration
		const variablePostion = new vscode.Position(18, 25);
		const variableSuggestions: vscode.Location[] = await testCompletion(variablePostion) as vscode.Location[];

		expect(variableSuggestions.length).to.equal(1);
		expect(variableSuggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'sample.js'));
		expect(variableSuggestions[0].range.start.line).to.equal(23);
	});

	it('should provide widget src definitions', async () => {
		const position = new vscode.Position(14, 21);
		const suggestions: vscode.DefinitionLink[] = await testCompletion(position) as vscode.DefinitionLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'widgets', 'widget-test', 'controllers', 'widget.js')));
	});

	it('should provide require src definitions', async () => {
		const position = new vscode.Position(15, 22);
		const suggestions: vscode.DefinitionLink[] = await testCompletion(position) as vscode.DefinitionLink[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].targetUri).to.deep.equal(vscode.Uri.file(path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'existing-file.js')));
	});

	it('should provide i18n definitions', async () => {
		const position = new vscode.Position(13, 55);
		const suggestions: vscode.Location[] = await testCompletion(position) as vscode.Location[];

		expect(suggestions.length).to.equal(1);
		expect(suggestions[0].uri.fsPath).to.equal(path.join(getCommonAlloyProjectDirectory(), 'app', 'i18n', 'en', 'strings.xml'));
	});
});
