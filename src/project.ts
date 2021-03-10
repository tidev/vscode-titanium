import * as fs from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';
import * as utils from './utils';

import { EventEmitter, Range, window, workspace } from 'vscode';
import { handleInteractionError, InteractionError } from './commands/common';
import { Platform } from './types/common';
import { parseXmlString } from './common/utils';

const TIAPP_FILENAME = 'tiapp.xml';
const TIMODULEXML_FILENAME = 'timodule.xml';
const MANIFEST_FILENAME = 'manifest';
const DASHBOARD_URL_ROOT = 'https://platform.axway.com/#/app/';

interface ModuleInformation {
	path: string;
	[ key: string ]: string;
}

export class Project {

	public isTitaniumApp = false;
	public isTitaniumModule = false;
	public isValidTiapp = false;

	private tiapp: any;
	private modules: ModuleInformation[] = [];
	private emitter: EventEmitter<void> = new EventEmitter();
	private hasModifiedListener = false;

	/**
	 * Check if the current project is a Titanium app or module.
	 * @returns {Boolean} Whether the project is a Titanium app or module.
	 */
	public isTitaniumProject (): boolean {
		return this.isTitaniumApp || this.isTitaniumModule;
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
	public load (): void {
		this.isTitaniumApp = false;
		this.isTitaniumModule = false;

		this.loadTiappFile();

		if (!this.isTitaniumApp) {
			this.loadModules();
		}
	}

	/**
	 * Register on modified callback
	 *
	 * @param {Function} callback	callback function
	 */
	public onModified (callback: () => void): void {
		if (this.isTitaniumApp && !this.hasModifiedListener) {
			this.emitter.event(callback);
			this.hasModifiedListener = true;
		}
	}

	/**
	 * App ID
	 *
	 * @returns {String}
	 */
	public appId (): string {
		if (this.isTitaniumApp) {
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
		if (this.isTitaniumApp) {
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
		if (this.isTitaniumModule) {
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
		if (this.isTitaniumApp) {
			return this.tiapp['sdk-version'];
		}
		return [];
	}

	/**
	 * Dispose of resources
	 */
	public dispose (): void {
		this.emitter.dispose();
	}

	/**
	 * Load tiapp file
	 *
	 */
	private async loadTiappFile  (): Promise<void> {
		this.isTitaniumApp = false;
		this.isValidTiapp = false;
		const rootPath = workspace.rootPath;
		if (!rootPath) {
			return;
		}

		const filePath = path.join(rootPath, TIAPP_FILENAME);
		if (!utils.fileExists(filePath)) {
			return;
		}

		this.isTitaniumApp = true;

		// if this is our first time running through then load setup the file watcher
		if (!this.tiapp) {
			workspace.onDidSaveTextDocument(async (event) => {
				if (event.fileName === filePath) {
					await this.loadTiappFile();
					this.emitter.fire();
				}
			});
		}

		try {
			const fileData = fs.readFileSync(filePath, 'utf-8');
			const json = await parseXmlString(fileData) as any;
			this.isValidTiapp = true;

			if (json && json['ti:app']) {
				this.tiapp = json['ti:app'];
			}
		} catch (err) {
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
					const file = path.join(workspace.rootPath!, 'tiapp.xml');
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
	private loadModules (): void {
		const rootPath = workspace.rootPath;
		if (!rootPath) {
			return;
		}
		const paths = [
			path.join(rootPath),
			path.join(rootPath, 'android'),
			path.join(rootPath, 'ios'),
			path.join(rootPath, 'iphone'),
		];
		for (let i = 0, numPaths = paths.length; i < numPaths; i++) {
			this.loadModuleAt(paths[i]);
		}
	}

	/**
	 * Load module
	 *
	 * @param {String} modulePath		path to module
	 */
	private loadModuleAt (modulePath: string): void {
		if (utils.directoryExists(modulePath)) {
			const timodulePath = path.join(modulePath, TIMODULEXML_FILENAME);
			const manifestPath = path.join(modulePath, MANIFEST_FILENAME);

			if (!utils.fileExists(timodulePath)) {
				return;
			}

			const fileData = fs.readFileSync(timodulePath, 'utf-8');
			const parser = new xml2js.Parser();
			let json;
			parser.parseString(fileData, (err: Error, result: unknown) => {
				if (!err) {
					json = result;
				}
			});
			if (json && json['ti:module']) {

				if (!fs.existsSync(manifestPath)) {
					return;
				}

				const manifest: ModuleInformation = {
					path: modulePath
				};

				fs.readFileSync(manifestPath).toString().split(/\r?\n/).forEach(line => {
					const match = line.match(/^(\S+)\s*:\s*(.*)$/);
					if (match) {
						manifest[match[1].trim()] = match[2].trim();
					}
				});
				manifest.platform = utils.normalisedPlatform(manifest.platform);

				this.modules.push(manifest);

				this.isTitaniumModule = true;
			}
		}
	}
}

export default new Project();
