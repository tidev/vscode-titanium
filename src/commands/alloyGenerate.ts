import * as fs from 'fs-extra';
import * as path from 'path';
import appc from '../appc';

import { window, workspace } from 'vscode';
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
	Widget = 'widgets' // ??
}

async function promptForDetails (type: AlloyComponentType, folder: AlloyComponentFolder, extension: AlloyComponentExtension) {
	const name = await window.showInputBox({ prompt: `Enter the name for your ${type}` });
	if (!name) {
		throw new UserCancellation();
	}
	const cwd = workspace.rootPath;
	const filePath = path.join(cwd, 'app', folder, `${name}${extension}`);
	if (await fs.pathExists(filePath)) {
		const shouldDelete = await window.showQuickPick([ 'Yes', 'No' ], { placeHolder: ` ${name} already exists. Overwrite it?` });
		if (shouldDelete.toLowerCase() !== 'yes' || shouldDelete.toLowerCase() === 'y') {
			throw new UserCancellation();
		}
	}
	return { cwd, filePath, name, type };
}

export async function generateComponent (type: AlloyComponentType, folder: AlloyComponentFolder, extension: AlloyComponentExtension) {
	const { cwd, filePath, name } = await promptForDetails(type, folder, extension);
	try {
		await appc.generate({
			cwd,
			type,
			name,
			force: true
		});
		const shouldOpen = await window.showInformationMessage(`${capitalizeFirstLetter(type)} ${name} created succesfully`, { title: 'Open' });
		if (shouldOpen) {
			const document = await workspace.openTextDocument(filePath);
			await window.showTextDocument(document);
		}
	} catch (error) {
		if (error instanceof UserCancellation) {
			return;
		}
		window.showErrorMessage(`Failed to create Alloy ${type} ${name}`);
	}
}

export async function generateModel () {
	const { cwd, filePath, name } = await promptForDetails(AlloyComponentType.Model, AlloyComponentFolder.Model, AlloyComponentExtension.Model);
	try {
		await appc.generate({
			cwd,
			type: AlloyComponentType.Model,
			name,
			force: true
		});
		const shouldOpen = await window.showInformationMessage(`${capitalizeFirstLetter(AlloyComponentType.Model)} ${name} created succesfully`, { title: 'Open' });
		if (shouldOpen) {
			const document = await workspace.openTextDocument(filePath);
			await window.showTextDocument(document);
		}
	} catch (error) {
		if (error instanceof UserCancellation) {
			return;
		}
		window.showErrorMessage(`Failed to create Alloy ${AlloyComponentType.Model} ${name}`);
	}
}
