import * as fs from 'fs-extra';
import * as path from 'path';
import appc from '../appc';

import { window, workspace } from 'vscode';
import { inputBox, quickPick } from '../quickpicks';
import { capitalizeFirstLetter } from '../utils';
import { UserCancellation } from './common';

export enum AlloyModelAdapterType {
	Properties = 'properties',
	SQL = 'sql'
}

export enum AlloyComponentType {
	Controller = 'controller',
	Migration = 'migration',
	Model = 'model',
	Style = 'style',
	View = 'view',
	Widget = 'widget'
}

export enum AlloyComponentFolder {
	Controller = 'controllers',
	Migration = 'migrations',
	Model = 'models',
	Style = 'style',
	View = 'views',
	Widget = 'widgets'
}
export enum AlloyComponentExtension {
	Controller = '.js',
	Migration = '.js',
	Model = '.js',
	Style = '.tss',
	View = '.xml',
	Widget = ''
}

async function promptForDetails (type: AlloyComponentType, folder: AlloyComponentFolder, extension: AlloyComponentExtension) {
	const name = await inputBox({ prompt: `Enter the name for your ${type}` });

	const cwd = workspace.rootPath;
	const mainFile = path.join(cwd, 'app', folder, `${name}${extension}`);
	const filePaths = [];
	if (type === AlloyComponentType.Widget) {
		filePaths.push(
			path.join(mainFile, 'controllers', 'widget.js'),
			path.join(mainFile, 'styles', 'widget.tss'),
			path.join(mainFile, 'views', 'widget.xml')
		);
	} else {
		filePaths.push(mainFile);
	}
	if (await fs.pathExists(mainFile)) {
		const shouldDelete = await quickPick([ 'Yes', 'No' ], { placeHolder: ` ${name} already exists. Overwrite it?` });
		if (shouldDelete.toLowerCase() !== 'yes' || shouldDelete.toLowerCase() === 'y') {
			throw new UserCancellation();
		}
	}
	return { cwd, filePaths, name, type };
}

export async function generateComponent (type: AlloyComponentType, folder: AlloyComponentFolder, extension: AlloyComponentExtension) {
	let name;
	try {
		const creationArgs = await promptForDetails(type, folder, extension);
		const cwd = creationArgs.cwd;
		const filePaths = creationArgs.filePaths;
		name = creationArgs.name;

		await appc.generate({
			cwd,
			type,
			name,
			force: true
		});
		const shouldOpen = await window.showInformationMessage(`${capitalizeFirstLetter(type)} ${name} created successfully`, { title: 'Open' });
		if (shouldOpen) {
			for (const file of filePaths) {
				const document = await workspace.openTextDocument(file);
				await window.showTextDocument(document, { preview: false });
			}

		}
	} catch (error) {
		if (error instanceof UserCancellation) {
			return;
		}
		window.showErrorMessage(`Failed to create Alloy ${type} ${name}`);
	}
}

export async function generateModel () {
	let name;
	try {
		const creationArgs = await promptForDetails(AlloyComponentType.Model, AlloyComponentFolder.Model, AlloyComponentExtension.Model);
		const adapterType = await quickPick([ 'properties', 'sql' ], { canPickMany: false, placeHolder: 'Which adapter type?' });
		const cwd = creationArgs.cwd;
		const filePaths = creationArgs.filePaths;
		name = creationArgs.name;
		await appc.generate({
			adapterType,
			cwd,
			type: AlloyComponentType.Model,
			name,
			force: true
		});
		const shouldOpen = await window.showInformationMessage(`${capitalizeFirstLetter(AlloyComponentType.Model)} ${name} created successfully`, { title: 'Open' });
		if (shouldOpen) {
			for (const file of filePaths) {
				const document = await workspace.openTextDocument(file);
				await window.showTextDocument(document);
			}
		}
	} catch (error) {
		if (error instanceof UserCancellation) {
			return;
		}
		window.showErrorMessage(`Failed to create Alloy ${AlloyComponentType.Model} ${name}`);
	}
}
