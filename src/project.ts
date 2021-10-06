import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

import { Range, window, workspace } from 'vscode';
import { handleInteractionError, InteractionError } from './commands/common';
import { Platform, ProjectType } from './types/common';
import { parseXmlString } from './common/utils';

const TIAPP_FILENAME = 'tiapp.xml';
const TIMODULE_FILENAME = 'timodule.xml';
const MANIFEST_FILENAME = 'manifest';

interface ModuleInformation {
	path: string;
	platform: Platform;
	[ key: string ]: string;
}

interface TiModule {
	'ti:module': {
		[ key: string ]: string
	}
}

interface TiApp {
	'ti:app': TiAppData
}

interface TiAppData {
	[ key: string ]: string|string[]
}

export class Project {
	public isValidTiapp = false;
	public filePath: string;
	public type: ProjectType;

	private tiapp: TiAppData;
	private modules: ModuleInformation[] = [];

	constructor(filePath: string, type: ProjectType) {
		this.filePath = filePath;
		this.type = type;
		this.tiapp = {};
	}

	/**
	 * Check if the current project has a valid tiapp.
	 * @returns {Boolean} Whether the project has a valid tiapp.xml.
	 */
	public isValid (): boolean {
		return this.isValidTiapp;
	}

	/**
	 * Load tiapp.xml file
	 */
	public async load (): Promise<void> {
		if (this.type === 'app') {
			await this.loadTiappFile();
		} else if (this.type === 'module') {
			await this.loadModules();
		}
	}

	/**
	 * App ID
	 *
	 * @returns {String}
	 */
	public appId (): string {
		if (this.type === 'app') {
			return String(this.tiapp.id);
		}
		throw new Error('Project is not a Titanium application');
	}

	/**
	 * Returns app name
	 *
	 * @returns {String}
	 */
	public appName (): string {
		if (this.type === 'app') {
			return String(this.tiapp.name);
		} else {
			return this.modules[0].name;
		}
	}

	/**
	 * Returns platforms for module project
	 *
	 * @returns {Array}
	 */
	public platforms (): string[]|undefined {
		if (this.type === 'module') {
			return this.modules.map((mod) => mod.platform);
		}
	}

	/**
	 * Returns path for given platform for module project
	 *
	 * @param {String} platform		Platform name
	 * @returns {String}
	 */
	public pathForPlatform (platform: Platform): string|undefined {
		const moduleInfo = this.modules.find((mod) => utils.normalisedPlatform(mod.platform) === platform);
		if (moduleInfo) {
			return moduleInfo.path;
		}
	}

	/**
	 * SDK version
	 *
	 * @returns {String}
	 */
	public sdk (): string[] {
		if (this.type === 'app') {
			return this.tiapp['sdk-version'] as string[];
		}
		return [];
	}

	/**
	 * Load tiapp file
	 *
	 */
	private async loadTiappFile  (): Promise<void> {
		this.isValidTiapp = false;
		const filePath = path.join(this.filePath, TIAPP_FILENAME);

		if (!await fs.pathExists(filePath)) {
			return;
		}

		try {
			const fileData = await fs.readFile(filePath, 'utf-8');
			const json = await parseXmlString<TiApp>(fileData);
			this.isValidTiapp = true;

			if (json && json['ti:app']) {
				this.tiapp = json['ti:app'];
			}
		} catch (err) {
			if (!(err instanceof Error)) {
				throw err;
			}
			let line: number;
			let column: number;
			let message = 'Errors found in tiapp.xml';
			const columnExp = /Column: (.*?)(?:\s|$)/g;
			const lineExp = /Line: (.*?)(?:\s|$)/g;
			const columnMatch = columnExp.exec(err.message);
			const lineMatch = lineExp.exec(err.message);

			if (lineMatch) {
				line = parseInt(lineMatch[1], 10);
				message = `${message} on line ${line + 1}`;
			}

			if (columnMatch) {
				column = parseInt(columnMatch[1], 10);
				message = `${message} in column ${column + 1}`;
			}

			const error = new InteractionError(message);
			error.interactionChoices.push({
				title: 'Open tiapp.xml',
				run: async () => {
					const file = path.join(this.filePath, 'tiapp.xml');
					const document = await workspace.openTextDocument(file);
					const linePrefix = new Range(line, 0, line, column);
					await window.showTextDocument(document.uri, { selection: linePrefix });
				}
			});
			await handleInteractionError(error);
		}
	}

	/**
	 * Attempt to find module projects by loading timodule.xml and manifest files
	 */
	private async loadModules (): Promise<void> {
		const paths = [
			path.join(this.filePath),
			path.join(this.filePath, 'android'),
			path.join(this.filePath, 'ios'),
			path.join(this.filePath, 'iphone'),
		];
		for (const filePath of paths) {
			await this.loadModuleAt(filePath);
		}
	}

	/**
	 * Load module
	 *
	 * @param {String} modulePath		path to module
	 */
	private async loadModuleAt (modulePath: string): Promise<void> {
		const timodulePath = path.join(modulePath, TIMODULE_FILENAME);
		const manifestPath = path.join(modulePath, MANIFEST_FILENAME);

		if (!await fs.pathExists(timodulePath)) {
			return;
		}

		const fileData = await fs.readFile(timodulePath, 'utf-8');
		const json = await parseXmlString<TiModule>(fileData);

		if (json && json['ti:module']) {

			if (!await fs.pathExists(manifestPath)) {
				return;
			}

			const manifestData: { [ key: string ]: string; } = {};
			const manifestContents = await fs.readFile(manifestPath, 'utf8');
			for (const line of manifestContents.split(/\r?\n/)) {
				const match = line.match(/^(\S+)\s*:\s*(.*)$/);
				if (match) {
					manifestData[match[1].trim()] = match[2].trim();
				}
			}

			const moduleInformation: ModuleInformation = {
				path: modulePath,
				platform: utils.normalisedPlatform(manifestData.platform as Platform),
				...manifestData
			};

			this.modules.push(moduleInformation);
		}
	}

	async isAlloyProject(): Promise<boolean> {
		if (this.type !== 'app') {
			return false;
		}

		if (await fs.pathExists(path.join(this.filePath, 'app'))) {
			return true;
		} else {
			return false;
		}
	}

	async getI18NPath (): Promise<string|undefined> {
		if (this.type !== 'app') {
			return;
		}

		if (await this.isAlloyProject()) {
			return path.join(this.filePath, 'app', 'i18n');
		} else {
			return path.join(this.filePath, 'i18n');
		}
	}
}
