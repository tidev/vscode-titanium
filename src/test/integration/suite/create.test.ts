import { expect } from 'chai';
import { EditorView, VSBrowser, Workbench, WebDriver, InputBox } from 'vscode-extension-tester';
import * as path from 'path';
import { homedir } from 'os';
import { DialogHandler } from 'vscode-extension-tester-native';
import * as fs from 'fs-extra';

describe('Application creation', function () {
	this.timeout(30000);

	let browser: VSBrowser;
	let driver: WebDriver;
	let wb: Workbench;

	before(async function () {
		browser = VSBrowser.instance;
		driver = browser.driver;
		const editorView = new EditorView();
		await editorView.closeAllEditors();
		await browser.waitForWorkbench();
		wb = new Workbench();
	});

	it('should be able to create a project', async function () {
		this.timeout(90000);
		await wb.executeCommand('Titanium: Create Titanium application');
		const input = await InputBox.create();
		await input.setText('my-test-project');
		await input.confirm();
		await input.setText('com.axway.e2e');
		await input.confirm();
		await driver.sleep(1000);
		await input.confirm();
		await input.setText('No');
		await input.confirm();
		await driver.sleep(100);
		await input.confirm();

		const dialog = await DialogHandler.getOpenDialog();
		await dialog.selectPath(path.join(homedir(), 'Desktop'));
		await dialog.confirm();
		const projectPath = path.join(homedir(), 'Desktop', 'my-test-project');
		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'tiapp.xml'))).to.equal(true);
	});
});
