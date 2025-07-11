import { expect } from 'chai';
import { EditorView, VSBrowser } from 'vscode-extension-tester';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { Project } from '../../util/project';
import { dismissNotifications } from '../../util/common';

describe('App smoke', function () {
	this.timeout(30000);

	let browser: VSBrowser;
	let project: Project;
	const tempDirectory = tmp.dirSync();
	const name = 'vscode-e2e-test';
	const projectPath = path.join(tempDirectory.name, name);

	before(async function () {
		this.timeout(180000);
		browser = VSBrowser.instance;
		const editorView = new EditorView();
		await editorView.closeAllEditors();
		await browser.waitForWorkbench();
		await dismissNotifications();
		project = new Project(browser);
		await project.waitForGetStarted();
	});

	after(async function () {
		if (tempDirectory) {
			await fs.remove(tempDirectory.name);
		}
	});

	it('Should create an app project', async function () {
		this.timeout(90000);

		await project.createApp({
			id: 'com.test.e2e',
			folder: tempDirectory.name,
			name,
			platforms: [ 'android', 'ios' ],
			dismissNotifications: false
		});

		expect(fs.existsSync(projectPath)).to.equal(true);
		expect(fs.existsSync(path.join(projectPath, 'tiapp.xml'))).to.equal(true);

		await project.openInWorkspace();
	});

	it('Android: should be able to build the app project', async function () {
		this.timeout(120000);

		await project.waitForEnvironmentDetectionCompletion();

		await project.buildApp({
			platform: 'android',
			target: 'emulator'
		});
	});

	it('Android: should be able to clean the app project', async function () {
		this.timeout(90000);

		await project.cleanApp();

		const buildFolder = path.join(projectPath, 'build');
		const buildFolderContents = await fs.readdir(buildFolder);

		expect(buildFolderContents.length).to.equal(0, 'More contents in the build folder than expected');
	});

	it('iOS: should be able to build the app project', async function () {
		this.timeout(120000);

		await project.waitForEnvironmentDetectionCompletion();

		await project.buildApp({
			platform: 'ios',
			target: 'simulator'
		});
	});

	it('iOS: should be able to clean the app project', async function () {
		this.timeout(90000);

		await project.cleanApp();

		const buildFolder = path.join(projectPath, 'build');
		const buildFolderContents = await fs.readdir(buildFolder);

		expect(buildFolderContents.length).to.equal(0, 'More contents in the build folder than expected');
	});
});
