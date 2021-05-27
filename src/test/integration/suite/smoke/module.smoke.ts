import { expect } from 'chai';
import { EditorView, VSBrowser, WebDriver } from 'vscode-extension-tester';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { Project } from '../../util/project';
import { dismissNotifications } from '../../util/common';

describe('Module smoke', function () {
	this.timeout(30000);

	let browser: VSBrowser;
	let project: Project;
	let driver: WebDriver;
	const tempDirectory = tmp.dirSync();
	const name = 'vscode-e2e-test-module';
	const projectPath = path.join(tempDirectory.name, name);

	before(async function () {
		this.timeout(180000);
		browser = VSBrowser.instance;
		driver = browser.driver;
		const editorView = new EditorView();
		await editorView.closeAllEditors();
		await browser.waitForWorkbench();
		await dismissNotifications();
		project = new Project(driver);
		await project.waitForGetStarted();
	});

	after(async function () {
		if (tempDirectory) {
			await fs.remove(tempDirectory.name);
		}
	});

	it('Should create a module project', async function () {
		this.timeout(90000);

		await project.createModule({
			id: 'com.axway.e2e',
			folder: tempDirectory.name,
			name,
			platforms: [ 'android', 'ios' ],
			codeBases: {
				android: 'kotlin',
				ios: 'swift'
			}
		});

		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'android'))).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'ios'))).to.equal(true);

		await project.openInWorkspace();
	});

	it('Android: should be able to package the module project', async function () {
		this.timeout(90000);

		await project.waitForEnvironmentDetectionCompletion();

		await project.packageModule({
			platform: 'android'
		});

		const zipPath = path.join(projectPath, 'android', 'dist', 'com.axway.e2e-android-1.0.0.zip');
		expect(fs.existsSync(zipPath)).to.equal(true, 'Module zip did not exist');
	});

	it('Android: should be able to clean the module project', async function () {
		this.timeout(90000);

		await project.cleanModule({
			platform: 'android'
		});

		const buildFolder = path.join(projectPath, 'android', 'build');
		const buildFolderContents = await fs.readdir(buildFolder);

		expect(buildFolderContents.length).to.equal(1, 'More contents in the build folder than expected');
	});

	it('iOS: should be able to package the module project', async function () {
		this.timeout(90000);

		await project.waitForEnvironmentDetectionCompletion();

		await project.packageModule({
			platform: 'ios'
		});

		const zipPath = path.join(projectPath, 'ios', 'dist', 'com.axway.e2e-iphone-1.0.0.zip');
		expect(fs.existsSync(zipPath)).to.equal(true, 'Module zip did not exist');
	});

	it('iOS: should be able to clean the module project', async function () {
		this.timeout(90000);

		await project.cleanModule({
			platform: 'ios'
		});

		expect(fs.existsSync(path.join(projectPath, 'ios', 'build'))).to.equal(false, 'Build folder still existed');
	});
});
