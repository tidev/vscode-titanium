import * as fs from 'fs-extra';
import * as path from 'path';

import { window, workspace } from 'vscode';
import { inputBox, quickPick } from '../quickpicks';
import { capitalizeFirstLetter } from '../utils';
import { UserCancellation } from './common';
import { promptForWorkspaceFolder } from '../quickpicks/common';
import { CommandResponse } from '../common/utils';
import { ExtensionContainer } from '../container';

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

export interface AlloyGenerateOptions {
	cwd: string;
	force?: boolean;
	type: Exclude<AlloyComponentType, AlloyComponentType.Model>;
	name: string;
}

export interface AlloyModelGenerateOptions {
	cwd: string;
	force?: boolean;
	adapterType: string;
	type: AlloyComponentType.Model;
	name: string;
}

async function promptForDetails (type: AlloyComponentType, folder: AlloyComponentFolder, extension: AlloyComponentExtension):
Promise<{ cwd: string; filePaths: string[]; name: string; type: AlloyComponentType }> {
	const name = await inputBox({ prompt: `Enter the name for your ${type}` });

	const { folder: workspaceFolder } = await promptForWorkspaceFolder();
	const cwd = workspaceFolder.uri.fsPath;
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
		const shouldDelete = await quickPick([ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' } ], { placeHolder: `${name} already exists. Overwrite it?` });
		if (shouldDelete.id === 'no') {
			throw new UserCancellation();
		}
	}
	return { cwd, filePaths, name, type };
}

export async function generateComponent (type: Exclude<AlloyComponentType, AlloyComponentType.Model>, folder: AlloyComponentFolder, extension: AlloyComponentExtension): Promise<void> {
	let name;
	try {
		const creationArgs = await promptForDetails(type, folder, extension);
		const cwd = creationArgs.cwd;
		const filePaths = creationArgs.filePaths;
		name = creationArgs.name;

		await generate({
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

export async function generateModel (): Promise<void> {
	let name;
	try {
		const creationArgs = await promptForDetails(AlloyComponentType.Model, AlloyComponentFolder.Model, AlloyComponentExtension.Model);
		const adapterType = await quickPick([ { id: 'properties', label: 'properties' }, { id: 'sql', label: 'sql' } ], { canPickMany: false, placeHolder: 'Which adapter type?' });
		const cwd = creationArgs.cwd;
		const filePaths = creationArgs.filePaths;
		name = creationArgs.name;
		await generate({
			adapterType: adapterType.id,
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

/**
 * Run `alloy generate` command
 *
 * @param {AlloyGenerateOptions|AlloyModelGenerateOptions} options - arguments.
 * @param {String} [options.adapterType] - Adapter to use for Alloy model
 * @param {String} options.cwd - Directory of the app.
 * @param {Boolean} options.force - Force creation of the component, will overwrite existing component.
 * @param {String} options.name -  Name of the component.
 * @param {String} options.type - Type to generate.
 * @returns {Promise}
 */
async function generate (options: AlloyGenerateOptions|AlloyModelGenerateOptions): Promise<CommandResponse> {
	const { cwd, force, name, type } = options;
	const args = [ 'generate', type, name ];

	if (options.type === AlloyComponentType.Model) {
		args.push(options.adapterType);
	}

	if (force) {
		args.push('--force');
	}

	return ExtensionContainer.terminal.runInBackground('alloy', args, { cwd });
}
