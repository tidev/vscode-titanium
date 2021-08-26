import * as chai from 'chai';
import * as path from 'path';
import * as related from '../../../related';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { ExtensionContainer } from '../../../container';
import { getFileUri } from '../utils';
import { Project } from '../../../project';
import { getCommonAlloyProjectDirectory } from '../../../test/common/utils';
import { sleep } from '../../../common/utils';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;
const sandbox = sinon.createSandbox();

describe('related', () => {
	const project = new Project(getCommonAlloyProjectDirectory(), 'app');

	const appDirectory = path.join(project.filePath, 'app');

	const indexView = path.join(appDirectory, 'views', 'index.xml');

	const tsLookUpController = path.join(appDirectory, 'controllers', 'ts-lookup.ts');
	const tsLookUpView = path.join(appDirectory, 'views', 'ts-lookup.xml');

	const noViewController = path.join(appDirectory, 'controllers', 'folder', 'test.js');

	const widgetsDirectory = path.join(appDirectory, 'widgets');
	const widgetIndexController = path.join(widgetsDirectory, 'widget-test', 'controllers', 'widget.js');
	const widgetIndexView = path.join(widgetsDirectory, 'widget-test', 'views', 'widget.xml');

	async function openEditor (fileName: string): Promise<void> {
		await vscode.window.showTextDocument(getFileUri(fileName), { preview: false });
	}

	beforeEach(async () => {
		// cleanup any open editors from previous tests. There's no public API to get all the
		// open editors, so do this fun little thing
		while (vscode.window.activeTextEditor) {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			await sleep(250);
		}
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('getTargetPath', () => {
		it('should throw if no file path provided and no activeEditor', async () => {
			await expect(related.getTargetPath(project, 'xml')).to.be.rejectedWith('No active edtor');
		});

		it('should throw if provided path is not under an alloy path', async () => {
			await expect(related.getTargetPath(project, 'js', '/foo')).to.be.rejectedWith('File is not part of an Alloy project');
		});

		it('should throw if provided path is not relevant', async () => {
			await expect(related.getTargetPath(project, 'js', path.join(appDirectory, 'config.json'))).to.be.rejectedWith('File is not a controller, style, view or widget');
		});

		it('should throw if no file found', async () => {
			await expect(related.getTargetPath(project, 'xml', noViewController)).to.be.rejectedWith('Unable to find related file');
		});

		it('should use active text editor if no path provided', async () => {
			await openEditor('controllers/index.js');
			await expect(related.getTargetPath(project, 'xml')).to.eventually.equal(indexView);
		});

		it('should handle widgets', async () => {
			await expect(related.getTargetPath(project, 'xml', widgetIndexController)).to.eventually.equal(widgetIndexView);
		});

		it('should find a ts file for a controller', async () => {
			await expect(related.getTargetPath(project, 'js', tsLookUpView)).to.eventually.equal(tsLookUpController);
		});

		it('should find a view file for a ts controller', async () => {
			await expect(related.getTargetPath(project, 'xml', tsLookUpController)).to.eventually.equal(tsLookUpView);
		});
	});

	describe('openRelatedFile', () => {
		it('should error if no active editor', async () => {
			const spy = sandbox.spy(vscode.window, 'showErrorMessage');
			await expect(related.openRelatedFile('js', project)).to.eventually.equal(undefined);
			expect(spy).to.have.been.calledOnceWith('No active editor');

		});

		it('should error if not part of Alloy project', async () => {
			await openEditor('../../../utils.ts');
			const spy = sandbox.spy(vscode.window, 'showErrorMessage');
			await expect(related.openRelatedFile('js', project)).to.eventually.equal(undefined);
			expect(spy).to.have.been.calledOnceWith('File is not part of an Alloy project');

		});

		it('should error if not related path', async () => {
			const spy = sandbox.spy(vscode.window, 'showErrorMessage');
			await openEditor('config.json');
			await expect(related.openRelatedFile('js', project)).to.eventually.equal(undefined);
			expect(spy).to.have.been.calledOnceWith('File is not a controller, style, view or widget', { modal: false });
		});

		it('open a related controller for view', async () => {
			await openEditor('views/index.xml');
			const file = await related.openRelatedFile('js', project);
			expect(vscode.window.visibleTextEditors).to.include(file);
		});

		it('should lookup project if not provided', async () => {
			sinon.stub(ExtensionContainer.projects, 'get').returns(project);
			await openEditor('views/index.xml');
			const file = await related.openRelatedFile('js');
			expect(vscode.window.visibleTextEditors).to.include(file);
		});
	});

	describe('openAllFiles', () => {
		it('should open all files', async () => {
			await openEditor('views/index.xml');
			await openEditor('styles/index.tss');
			const spy = sandbox.spy(vscode.window, 'showTextDocument');
			await related.openAllFiles();
			expect(spy).callCount(3);
		});
	});
});
