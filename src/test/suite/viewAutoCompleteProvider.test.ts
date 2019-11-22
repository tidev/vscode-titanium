import { expect } from 'chai';
import * as fs from 'fs';
import { after, before, describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import * as tce from 'titanium-editor-commons';
import * as vscode from 'vscode';
import project from '../../project';

import { ViewCompletionItemProvider } from '../../providers/completion/viewCompletionItemProvider';

const fixturesPath = path.join(__dirname, '../../..', 'src', 'test', 'suite', 'fixtures');
const xmlFile = path.join(fixturesPath, 'sample.xml');
const uri = vscode.Uri.file(xmlFile);
const rawData = fs.readFileSync(path.join(fixturesPath, 'data', 'completions.json'), 'utf8');
const completions = JSON.parse(rawData);

async function testCompletion (position: vscode.Position) {
	const text = await vscode.workspace.openTextDocument(uri);
	const provider = new ViewCompletionItemProvider();
	const context: vscode.CompletionContext = {
		triggerKind: vscode.CompletionTriggerKind.Invoke,
	};
	const cancellationToken = new vscode.CancellationTokenSource();
	return provider.provideCompletionItems(text, position, cancellationToken.token, context);
}
let sandbox: sinon.SinonSandbox;

describe('View suggestions', () => {

	before(async function () {
		this.timeout(5000);
		sandbox = sinon.createSandbox();
		sandbox.stub(project, 'sdk').returns(['8.1.0.GA']);
		sandbox.stub(tce.completion, 'loadCompletions').resolves(completions);
	});

	after(async function () {
		this.timeout(5000);
		sandbox.restore();

	});

	it('Should provide tag suggestions', async () => {
		const position = new vscode.Position(2, 11); // <Wi
		const suggestions: any = await testCompletion(position);

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
		const position = new vscode.Position(2, 22); // <Window onOpen
		const suggestions: any = await testCompletion(position);

		expect(suggestions.length).to.equal(1);

		expect(suggestions[0].label).to.equal('onOpen');
		expect(suggestions[0].insertText.value).to.equal('onOpen="$1"$0');
		expect(suggestions[0].kind).to.equal(22);

	});
});
