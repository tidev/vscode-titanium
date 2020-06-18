import { expect } from 'chai';
import { EditorView, VSBrowser, WebDriver } from 'vscode-extension-tester';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import * as xml2js from 'xml2js';
import { parsePlatformsFromTiapp, dismissNotifications } from '../util/common';
import { ProjectCreator } from '../util/create';

describe('Application creation', function () {
	this.timeout(30000);

	let browser: VSBrowser;
	let driver: WebDriver;
	let tempDirectory: tmp.DirResult;

	beforeEach(async function () {
		browser = VSBrowser.instance;
		driver = browser.driver;
		const editorView = new EditorView();
		await editorView.closeAllEditors();
		await browser.waitForWorkbench();
		tempDirectory = tmp.dirSync();
		await dismissNotifications();
	});

	afterEach(async function () {
		await fs.remove(tempDirectory.name);
	});

	it('should be able to create a project', async function () {
		this.timeout(60000);
		const name = 'vscode-e2e-test-app';
		const creator = new ProjectCreator(driver);

		await creator.createApp({
			id: 'com.axway.e2e',
			enableServices: false,
			folder: tempDirectory.name,
			name,
			platforms: [ 'android', 'ios' ]
		});

		const projectPath = path.join(tempDirectory.name, name);
		const tiappPath = path.join(projectPath, 'tiapp.xml');
		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(tiappPath)).to.equal(true);
		const parser = new xml2js.Parser();
		const { 'ti:app': tiapp } = await parser.parseStringPromise(fs.readFileSync(tiappPath, 'utf8'));
		expect(tiapp.name[0]).to.equal(name);
		const platforms = parsePlatformsFromTiapp(tiapp);
		expect(platforms).to.deep.equal([ 'android', 'ipad', 'iphone' ]);
	});

	it('should only enable selected platforms', async function () {
		this.timeout(60000);
		const name = 'vscode-e2e-test-app';
		const creator = new ProjectCreator(driver);
		await creator.createApp({
			id: 'com.axway.e2e',
			enableServices: false,
			folder: tempDirectory.name,
			name,
			platforms: [ 'android' ]
		});

		const projectPath = path.join(tempDirectory.name, name);
		const tiappPath = path.join(projectPath, 'tiapp.xml');
		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(tiappPath)).to.equal(true);
		const parser = new xml2js.Parser();
		const { 'ti:app': tiapp } = await parser.parseStringPromise(fs.readFileSync(tiappPath, 'utf8'));
		expect(tiapp.name[0]).to.equal(name);
		const platforms = parsePlatformsFromTiapp(tiapp);
		expect(platforms).to.deep.equal([ 'android' ]);
	});
});
