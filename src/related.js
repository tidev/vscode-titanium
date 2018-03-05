const vscode = require('vscode');
const Uri = vscode.Uri;
const _ = require('underscore');
const utils = require('./utils');
const path = require('path');

let alloyDirectoryMap = {
	xml: 'views',
	tss: 'styles',
	js: 'controllers'
};

module.exports = {

	/**
	 * Open related file
	 *
	 * @param {String} type 	view, style, controller
	 * @returns {Thenable}
	 */
	openRelatedFile(type) {
		if (!vscode.window.activeTextEditor) {
			return;
		}
		const relatedPath = this.getTargetPath(type);
		if (!vscode.window.visibleTextEditors.find(editor => editor.document.fileName === relatedPath)) {
			return vscode.window.showTextDocument(Uri.file(relatedPath), { preview: false });
		}
	},

	/**
	 * Open or close related files
	 */
	async toggleAllRelatedFiles() {
		if (!vscode.window.activeTextEditor) {
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
		this.openAllFiles();
		// } else {
		// 	this.closeRelatedFiles();
		// }
	},

	/**
	 * Open related files
	 */
	async openAllFiles() {
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
			this.openRelatedFile(type);
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
	},

	/**
	 * Close related files
	 */
	closeRelatedFiles() {
		// let { forceAllClose } = args;
		// let activeEditor = atom.workspace.getActiveTextEditor();
		// if (!activeEditor) {
		// 	return;
		// }

		// let relatedFilePaths = this.getRelatedFilePaths(activeEditor.getPath());
		// if (forceAllClose) {
		// 	relatedFilePaths.push(activeEditor.getPath());
		// }
		// let allEditors = atom.workspace.getTextEditors();

		// // find and close
		// _.each(allEditors, (editor) => {
		// 	if (_.contains(relatedFilePaths, editor.getPath())) {
		// 		editor.destroy();
		// 	}
		// });
	},

	/**
	 * Get paths for related files
	 *
	 * @returns {Array}
	 */
	getRelatedFilePaths() {
		if (!vscode.window.activeTextEditor) {
			return [];
		}
		const currentPath = vscode.window.activeTextEditor.document.fileName;
		let pathSplit = path.relative(utils.getAlloyRootPath(), currentPath).split(path.sep);
		let currentType = pathSplit[0] === 'widgets' ? pathSplit[2] : pathSplit[0];
		let hasRelatedFiles = [ 'views', 'styles', 'controllers' ].indexOf(currentType) >= 0;
		let fileExt = path.parse(currentPath).ext.substr(1);
		let isAppTss = currentPath.endsWith(path.join('/app/styles/app.tss')); // TODO : make more advanced Detection
		let isAlloyJs = currentPath.endsWith(path.join('/app/alloy.js')); // TODO : make more advanced Detection

		if (!utils.isAlloyProject() || (!hasRelatedFiles && !isAppTss && !isAlloyJs)) {
			return [];
		}

		let relatedFilePaths = [];

		if (isAppTss) {
			relatedFilePaths = [ currentPath.replace(path.join('/app/styles/app.tss'), path.join('/app/alloy.js')) ];
		} else if (isAlloyJs) {
			relatedFilePaths = [ currentPath.replace(path.join('/app/alloy.js'), path.join('/app/styles/app.tss')) ];
		} else {
			_.each(alloyDirectoryMap, (folderName, ext) => {
				if (ext !== fileExt) {
					return relatedFilePaths.push(this.getTargetPath(ext, currentPath));
				}
			});
		}

		return relatedFilePaths;
	},

	/**
	 * Get path of related file
	 *
	 * @param {String} type 			view, style, controller
	 * @param {String} currentFilePath	path of current file
	 * @returns {String}
	 */
	getTargetPath(type, currentFilePath) {
		if (!currentFilePath) {
			currentFilePath = vscode.window.activeTextEditor.document.fileName;
		}

		let pathUnderAlloy = path.relative(utils.getAlloyRootPath(), currentFilePath);
		let pathSplitArr = pathUnderAlloy.split(path.sep);

		if (pathSplitArr[0] === 'widgets') {
			pathSplitArr[2] = alloyDirectoryMap[type];  // change type
		} else {
			pathSplitArr[0] = alloyDirectoryMap[type];  // change type
		}

		let fileSplitArr = pathSplitArr[pathSplitArr.length - 1].split('.');
		fileSplitArr[fileSplitArr.length - 1] = type; // change ext

		const targetPath = path.resolve(utils.getAlloyRootPath(), pathSplitArr.join(path.sep), '..', fileSplitArr.join('.'));
		return targetPath;
	}
};
