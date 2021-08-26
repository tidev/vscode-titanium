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

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;
const sandbox = sinon.createSandbox();

describe('related', () => {
	const project = new Project(getCommonAlloyProjectDirectory(), 'app');

	const appDirectory = path.join(project.filePath, 'app');

	const indexView = path.join(appDirectory, 'views', 'index.xml');

	const widgetsDirectory = path.join(appDirectory, 'widgets');
	const widgetIndexController = path.join(widgetsDirectory, 'widget-test', 'controllers', 'widget.js');
	const widgetIndexView = path.join(widgetsDirectory, 'widget-test', 'views', 'widget.xml');

	async function openEditor (fileName: string): Promise<void> {
		await vscode.window.showTextDocument(getFileUri(fileName), { preview: false });
	}

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const _editor of vscode.window.visibleTextEditors) {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		}
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('getTargetPath', () => {
		it('should throw if no file path provided and no activeEditor', async () => {
			expect(() => related.getTargetPath(project, 'xml')).to.throw('No active edtor');
		});

		it('should throw if provided path is not under an alloy path', () => {
			expect(() => related.getTargetPath(project, 'js', '/foo')).to.throw('File is not part of an Alloy project');
		});

		it('should throw if provided path is not relevant', () => {
			expect(() => related.getTargetPath(project, 'js', path.join(appDirectory, 'config.json'))).to.throw('File is not a controller, style, view or widget');
		});

		it('should use active text editor if no path provided', async () => {
			await openEditor('controllers/index.js');
			expect(related.getTargetPath(project, 'xml')).to.equal(indexView);
		});

		it('should handle widgets', () => {
			expect(related.getTargetPath(project, 'xml', widgetIndexController)).to.equal(widgetIndexView);
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
