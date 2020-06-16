import { expect } from 'chai';
import { EditorView, VSBrowser, Workbench, WebDriver, InputBox } from 'vscode-extension-tester';
import * as path from 'path';
import { DialogHandler } from 'vscode-extension-tester-native';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import * as xml2js from 'xml2js';
import { notificationExists, parsePlatformsFromTiapp } from '../util/common';

/**
 * Creates an application project
 *
 * @param {CreateOptions} createOptions - Properties required for creation of the project
 * @param {WebDriver} driver - WebDriver instance
 * @param {WorkBench} wb - Workbench instance
 */
async function createApplication ({ id, folder, name, platforms }: ModuleCreateOptions, driver: WebDriver, wb: Workbench): Promise<void> {
	await wb.executeCommand('Titanium: Create Titanium module');
	const input = await InputBox.create();
	// Input name
	await input.setText(name);
	await input.confirm();
	// Input module ID
	await input.setText(id);
	await input.confirm();
	await driver.sleep(100);
	// Select platforms
	const choices = await input.getQuickPicks();
	for (const choice of choices) {
		const text = await choice.getText();
		if (!platforms.includes(text.toLowerCase())) {
			await input.selectQuickPick(text);
			await driver.sleep(50);
		}
	}
	await input.confirm();

	// Browse for file location
	await input.confirm();
	const dialog = await DialogHandler.getOpenDialog();
	await dialog.selectPath(folder);
	await dialog.confirm();

	await driver.wait(() => notificationExists('Creating module'), 1000);

	await driver.wait(async () => {
		// We need to sleep here as there are times when the "Creating module" notification
		// is still shown but is dismissed by the time we get the text in notificationExists and
		// causes errors to be thrown that can't be handled
		await driver.sleep(500);
		return notificationExists('Project created');
	}, 25000);
}

describe.only('Module creation', function () {
	this.timeout(30000);

	let browser: VSBrowser;
	let driver: WebDriver;
	let wb: Workbench;
	let tempDirectory: tmp.DirResult;

	beforeEach(async function () {
		browser = VSBrowser.instance;
		driver = browser.driver;
		const editorView = new EditorView();
		await editorView.closeAllEditors();
		await browser.waitForWorkbench();
		wb = new Workbench();
		tempDirectory = tmp.dirSync();
	});

	afterEach(async function () {
		await fs.remove(tempDirectory.name);
	});

	it('should be able to create a module project', async function () {
		this.timeout(60000);

		const name = 'vscode-e2e-test-module';
		await createApplication({
			id: 'com.axway.e2e',
			folder: tempDirectory.name,
			name,
			platforms: [ 'android', 'ios' ]
		}, driver, wb);

		const projectPath = path.join(tempDirectory.name, name);
		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'android'))).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'ios'))).to.equal(true);
	});

	it('should only enable selected platforms', async function () {
		this.timeout(60000);

		const name = 'vscode-e2e-test-module';
		await createApplication({
			id: 'com.axway.e2e',
			folder: tempDirectory.name,
			name,
			platforms: [ 'android' ]
		}, driver, wb);

		const projectPath = path.join(tempDirectory.name, name);
		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'android'))).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'ios'))).to.equal(false);
	});
});
