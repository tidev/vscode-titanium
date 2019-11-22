import * as path from 'path';
import * as _ from 'underscore';
import { getAlloyRootPath, isAlloyProject } from './utils';

import { Uri, window } from 'vscode';

const alloyDirectoryMap: { [key: string]: string } = {
	xml: 'views',
	tss: 'styles',
	js: 'controllers'
};

/**
 * Open related file
 *
 * @param {String} type 	view, style, controller
 * @returns {Thenable}
 */
export function openRelatedFile (type: string) {
	if (!window.activeTextEditor) {
		return;
	}
	const relatedPath = getTargetPath(type);
	if (relatedPath && !window.visibleTextEditors.find(editor => editor.document.fileName === relatedPath)) {
		return window.showTextDocument(Uri.file(relatedPath), { preview: false });
	}
}

/**
 * Open or close related files
 */
export async function  toggleAllRelatedFiles () {
	if (!window.activeTextEditor) {
		return;
	}

	// let editorPanes = atom.workspace.getCenter().getPanes();
	// let isAlreadyAllFocused = true;

	// var activeItemPaths = _.map(editorPanes, (pane) => {
	// 	if (pane.activeItem && pane.activeItem.getPath) {
	// 		return pane.activeItem.getPath();
	// 	}
	// });

	// let relatedFilePaths = this.getRelatedFilePaths(editor.getPath());

	// _.each(relatedFilePaths, (path) => {
	// 	if (!_.contains(activeItemPaths, path)) {
	// 		isAlreadyAllFocused = false;
	// 	}
	// });

	// // if hanve 3 pane and active is already relatedfiles
	// if (editorPanes.length < 3 || !isAlreadyAllFocused) {
	openAllFiles();
	// } else {
	// 	this.closeRelatedFiles();
	// }
}

/**
 * Open related files
 */
export async function openAllFiles () {
	// let editor = atom.workspace.getActiveTextEditor();
	// let previousActivePane = atom.workspace.getActivePane();
	// if (!vscode.window.activeTextEditor) {
	// 	return;
	// }

	// const currentFilePath = editor.getPath();
	// let relatedFilePaths = this.getRelatedFilePaths();
	// if (!relatedFilePaths.length) {
	// 	return;
	// }

	[ 'xml', 'tss', 'js' ].forEach(type => {
		openRelatedFile(type);
	});

	// // if number of panes is under 3, make more.
	// // let numberOfPanes = atom.workspace.getCenter().getPanes();

	// while (atom.workspace.getCenter().getPanes().length < (relatedFilePaths.length + 1)) {
	// 	let lastPane = _.last(atom.workspace.getCenter().getPanes());
	// 	lastPane.splitRight();
	// }

	// let panes = atom.workspace.getCenter().getPanes();

	// let newPaneIdx = 0;
	// for (const pane of _.without(panes, previousActivePane)) {
	// 	let filePath = relatedFilePaths[newPaneIdx++];
	// 	if (filePath) {
	// 		pane.activate();
	// 		await atom.workspace.open(filePath, {}).then(function () {
	// 			previousActivePane.activate();
	// 		});
	// 	}
	// }

	// // close duplicateItem

	// _.each(panes, (pane) => {
	// 	_.each(relatedFilePaths.concat(currentFilePath), (path) => {
	// 		let duplicateItem = pane.itemForURI(path);
	// 		if (duplicateItem && duplicateItem !== pane.getActiveItem()) {
	// 			pane.destroyItem(duplicateItem);
	// 		}
	// 	});
	// });
}

/**
 * Get paths for related files
 *
 * @returns {Array}
 */
export function getRelatedFilePaths () {
	if (!window.activeTextEditor) {
		return [];
	}
	const currentPath = window.activeTextEditor.document.fileName;
	const pathSplit = path.relative(getAlloyRootPath(), currentPath).split(path.sep);
	const currentType = pathSplit[0] === 'widgets' ? pathSplit[2] : pathSplit[0];
	const hasRelatedFiles = [ 'views', 'styles', 'controllers' ].indexOf(currentType) >= 0;
	const fileExt = path.parse(currentPath).ext.substr(1);
	const isAppTss = currentPath.endsWith(path.join('/app/styles/app.tss')); // TODO : make more advanced Detection
	const isAlloyJs = currentPath.endsWith(path.join('/app/alloy.js')); // TODO : make more advanced Detection

	if (!isAlloyProject() || (!hasRelatedFiles && !isAppTss && !isAlloyJs)) {
		return [];
	}

	let relatedFilePaths: string[] = [];

	if (isAppTss) {
		relatedFilePaths = [ currentPath.replace(path.join('/app/styles/app.tss'), path.join('/app/alloy.js')) ];
	} else if (isAlloyJs) {
		relatedFilePaths = [ currentPath.replace(path.join('/app/alloy.js'), path.join('/app/styles/app.tss')) ];
	} else {
		_.each(alloyDirectoryMap, (folderName, ext) => {
			if (ext !== fileExt) {
				const relatedFilePath = getTargetPath(ext, currentPath);
				if (relatedFilePath) {
					return relatedFilePaths.push();
				}
			}
		});
	}

	return relatedFilePaths;
}

/**
 * Get path of related file
 *
 * @param {String} type 			view, style, controller
 * @param {String} currentFilePath	path of current file
 * @returns {String}
 */
export function getTargetPath (type: string, currentFilePath?: string) {
	if (!currentFilePath) {
		currentFilePath = window.activeTextEditor?.document.fileName;
	}

	if (!currentFilePath || currentFilePath.indexOf(getAlloyRootPath()) === -1) {
		return;
	}

	const pathUnderAlloy = path.relative(getAlloyRootPath(), currentFilePath);
	const pathSplitArr = pathUnderAlloy.split(path.sep);

	if (pathSplitArr[0] === 'widgets') {
		pathSplitArr[2] = alloyDirectoryMap[type];  // change type
	} else {
		pathSplitArr[0] = alloyDirectoryMap[type];  // change type
	}

	const fileSplitArr = pathSplitArr[pathSplitArr.length - 1].split('.');
	fileSplitArr[fileSplitArr.length - 1] = type; // change ext

	const targetPath = path.resolve(getAlloyRootPath(), pathSplitArr.join(path.sep), '..', fileSplitArr.join('.'));
	return targetPath;
}
