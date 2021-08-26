import * as path from 'path';
import * as utils from './utils';

import { Uri, window, TextEditor, TextDocument } from 'vscode';
import { ExtensionContainer } from './container';
import { Project } from './project';
import { handleInteractionError, InteractionError } from './commands';

const alloyDirectoryMap: { [key: string]: string } = {
	xml: 'views',
	tss: 'styles',
	js: 'controllers'
};

/**
 * Get path of related file
 *
 * @param {Project} project - The Titanium project instance
 * @param {String} type 			view, style, controller
 * @param {String} currentFilePath	path of current file
 * @returns {String}
 */
export function getTargetPath (project: Project, type: string, currentFilePath = window.activeTextEditor?.document.fileName): string {
	if (!currentFilePath) {
		throw new InteractionError('No active edtor');
	}

	const alloyRootPath = path.join(project.filePath, 'app');

	if (!currentFilePath.includes(alloyRootPath)) {
		throw new InteractionError('File is not part of an Alloy project');
	}

	const pathUnderAlloy = path.relative(alloyRootPath, currentFilePath);

	if (!/^(controllers|styles|views|widgets)/.test(pathUnderAlloy)) {
		throw new InteractionError('File is not a controller, style, view or widget');
	}

	const pathSplitArr = pathUnderAlloy.split(path.sep);

	if (pathSplitArr[0] === 'widgets') {
		pathSplitArr[2] = alloyDirectoryMap[type];  // change type
	} else {
		pathSplitArr[0] = alloyDirectoryMap[type];  // change type
	}

	const fileSplitArr = pathSplitArr[pathSplitArr.length - 1].split('.');
	fileSplitArr[fileSplitArr.length - 1] = type; // change ext

	const targetPath = path.resolve(alloyRootPath, pathSplitArr.join(path.sep), '..', fileSplitArr.join('.'));
	return targetPath;
}

/**
 * Open related file
 *
 * @param {String} type 	view, style, controller
 * @param {Project} [project] - The Titanium project instance
 * @returns {Thenable}
 */
export async function openRelatedFile (type: string, project?: Project): Promise<TextEditor|undefined> {
	if (!window.activeTextEditor) {
		window.showErrorMessage('No active editor');
		return;
	}

	if (!project) {
		const activeDocument = window.activeTextEditor.document;
		const proj = await getProject(activeDocument);

		if (!proj) {
			return;
		}
		project = proj;
	}

	try {
		const relatedPath = getTargetPath(project, type);
		// Don't check to see if it's open as we can only get the currently active editor anyway
		return window.showTextDocument(Uri.file(relatedPath), { preview: false });
	} catch (error) {
		if (error instanceof InteractionError) {
			handleInteractionError(error);
		}
	}
}

/**
 * Open related files
 * @param {Project} [project] - The Titanium project instance
 */
export async function openAllFiles (project?: Project): Promise<void> {
	for (const type of [ 'xml', 'tss', 'js' ]) {
		await openRelatedFile(type, project);
	}
}

async function getProject (document: TextDocument): Promise<Project|undefined> {
	const filePath = document.uri.fsPath;
	const projectDir = await utils.findProjectDirectory(filePath);
	return ExtensionContainer.projects.get(projectDir);
}
