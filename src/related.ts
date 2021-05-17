import * as path from 'path';

import { Uri, window, TextEditor } from 'vscode';
import { Project } from './project';
import { getProject } from './providers/definition/common';

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
export function getTargetPath (project: Project, type: string, currentFilePath?: string): string|undefined {
	if (!currentFilePath) {
		currentFilePath = window.activeTextEditor?.document.fileName;
	}

	const alloyRootPath = path.join(project.filePath, 'app');

	if (!currentFilePath || !currentFilePath.includes(alloyRootPath)) {
		return;
	}

	const pathUnderAlloy = path.relative(alloyRootPath, currentFilePath);
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

	const relatedPath = getTargetPath(project, type);
	if (!relatedPath) {
		return;
	}
	if (!window.visibleTextEditors.find(editor => editor.document.fileName === relatedPath)) {
		return window.showTextDocument(Uri.file(relatedPath), { preview: false });
	}
}

/**
 * Open related files
 * @param {Project} [project] - The Titanium project instance
 */
export async function openAllFiles (project?: Project): Promise<void> {
	[ 'xml', 'tss', 'js' ].forEach(type => {
		openRelatedFile(type, project);
	});
}
