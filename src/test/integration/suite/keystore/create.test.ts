import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EditorView, InputBox, VSBrowser, WebDriver, WebView, By } from 'vscode-extension-tester';
import { dismissNotifications, CommonUICreator } from '../../util/common';
import { getCommonAlloyProjectDirectory } from '../../../common/utils';
import { basename, join } from 'path';

describe('Keystore creation', function () {
	this.timeout(30000);

	chai.use(chaiAsPromised);
	const { expect } = chai;

	const projectDirectory = getCommonAlloyProjectDirectory();
	let browser: VSBrowser;
	let driver: WebDriver;
	let tempDirectory: tmp.DirResult;
	let creator: CommonUICreator;
	let webview: WebView|undefined;

	before(async function () {
		this.timeout(180000);
		browser = VSBrowser.instance;
		driver = browser.driver;
		const editorView = new EditorView();
		await editorView.closeAllEditors();
		await browser.waitForWorkbench();
		tempDirectory = tmp.dirSync();
		creator = new CommonUICreator(driver);
		await dismissNotifications();
		await fs.copy(projectDirectory, tempDirectory.name);
		await creator.openFolder(tempDirectory.name);
		await creator.waitForGetStarted();
	});

	afterEach(async () => {
		if (webview) {
			await webview.switchBack();
			webview = undefined;
		}
	});

	it('should create a keystore', async () => {

		await creator.workbench.executeCommand('Titanium: Create keystore');

		const input = await InputBox.create();
		await input.setText(basename(tempDirectory.name));
		await input.confirm();
		await driver.sleep(1000);

		webview = new WebView();
		await webview.switchToFrame();
		(await webview.findWebElement(By.id('password'))).sendKeys('apassword');
		const validation = await webview.findWebElement(By.id('confirmPasswordValidation'));
		expect(validation.getText()).to.eventually.include('Keystore password and confirmation do not match');
		(await webview.findWebElement(By.id('confirmPassword'))).sendKeys('apassword');
		(await webview.findWebElement(By.id('alias'))).sendKeys('tester');
		(await webview.findWebElement(By.id('name'))).sendKeys('Tester Test');
		(await webview.findWebElement(By.id('orgUnit'))).sendKeys('Tester & Test Co.');
		(await webview.findWebElement(By.id('org'))).sendKeys('Testing');
		(await webview.findWebElement(By.id('city'))).sendKeys('Testing');
		(await webview.findWebElement(By.id('state'))).sendKeys('Testing');
		(await webview.findWebElement(By.id('country'))).sendKeys('TE');
		await driver.sleep(2500);
		(await webview.findWebElement(By.id('buttonFinish'))).click();

		await driver.sleep(1000);

		expect(fs.pathExistsSync(join(tempDirectory.name, 'keystore'))).to.equal(true, 'Keystore did not get created');
	});
});
