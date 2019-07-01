import * as fs from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';
import * as utils from './utils';

import { EventEmitter, Range, window, workspace } from 'vscode';
import { handleInteractionError, InteractionError } from './commands/common';

const TIAPP_FILENAME = 'tiapp.xml';
const TIMODULEXML_FILENAME = 'timodule.xml';
const MANIFEST_FILENAME = 'manifest';
const DASHBOARD_URL_ROOT = 'https://platform.axway.com/#/app/';

export class Project {

	public isTitaniumApp: boolean = false;
	public isTitaniumModule: boolean = false;

	private tiapp: any;
	private modules: any[] = [];
	private emitter: EventEmitter<void>;

	/**
	 * Check if the current project is a Titanium app or module.
	 * @returns {Boolean} Whether the project is a Titanium app or module.
	 */
	public isTitaniumProject () {
		return this.isTitaniumApp || this.isTitaniumModule;
	}

	/**
	 * Load tiapp.xml file
	 */
	public load () {
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
	public onModified (callback) {
		if (this.isTitaniumApp) {
			this.emitter.event(callback);
		}
	}

	/**
	 * App ID
	 *
	 * @returns {String}
	 */
	public appId () {
		if (this.isTitaniumApp) {
			return String(this.tiapp.id);
		}
	}

	/**
	 * Returns app name
	 *
	 * @returns {String}
	 */
	public appName () {
		if (this.isTitaniumApp) {
			return String(this.tiapp.name);
		} else {
			return this.modules[0].name;
		}
	}

	public dashboardUrl () {
		// this.tiapp.property[2].$.name
		const appcAppIdProperty = this.tiapp.property.find(property => property.$.name === 'appc-app-id');
		if (appcAppIdProperty) {
			return path.join(DASHBOARD_URL_ROOT, appcAppIdProperty._);
		}
	}

	/**
	 * Returns platforms for module project
	 *
	 * @returns {Array}
	 */
	public platforms () {
		if (this.isTitaniumModule) {
			return this.modules.map((mod: any) => mod.platform);
		}
	}

	/**
	 * Returns path for given platform for module project
	 *
	 * @param {String} platform		Platform name
	 * @returns {String}
	 */
	public pathForPlatform (platform) {
		const moduleInfo: any = this.modules.find((mod: any) => utils.normalisedPlatform(mod.platform) === platform);
		if (moduleInfo) {
			return moduleInfo.path;
		}
	}

	/**
	 * SDK version
	 *
	 * @returns {String}
	 */
	public sdk () {
		if (this.isTitaniumApp) {
			return this.tiapp['sdk-version'];
		}
	}

	/**
	 * Dispose of resources
	 */
	public dispose () {
		this.emitter.dispose();
	}

	/**
	 * Load tiapp file
	 *
	 */
	private async loadTiappFile  () {
		this.isTitaniumApp = false;
		let error;
		const rootPath = workspace.rootPath;
		if (!rootPath) {
			return;
		}
		const filePath = path.join(rootPath, TIAPP_FILENAME);
		if (utils.fileExists(filePath)) {
			this.isTitaniumApp = true;
			const fileData = fs.readFileSync(filePath, 'utf-8');
			const parser = new xml2js.Parser();
			let json;
			parser.parseString(fileData, (err, result) => {
				if (err) {
					error = new InteractionError(`Errors found in tiapp.xml \n ${err}`);
					error.interactionChoices.push({
						title: 'Open tiapp.xml',
						run: async () => {
							const file = path.join(workspace.rootPath, 'tiapp.xml');
							const document = await workspace.openTextDocument(file);
							const columnExp = /Column: (.*?)(?:\s|$)/g;
							const column = columnExp.exec(err)[1];
							const lineExp = /Line: (.*?)(?:\s|$)/g;
							const line = lineExp.exec(err)[1];
							const linePrefix = new Range(+line, 0, +line, +column);
							await window.showTextDocument(document.uri, { selection: linePrefix });
						}
					});
					return error;
				}
				json = result;
			});
			if (error instanceof InteractionError) {
				await handleInteractionError(error);
			}

			if (json && json['ti:app']) {
				this.tiapp = json['ti:app'];
			}

			if (!this.emitter) {
				this.emitter = new EventEmitter();
				workspace.onDidSaveTextDocument(event => {
					if (event.fileName === filePath) {
						this.loadTiappFile();
						this.emitter.fire();
					}
				});
			}
		}
	}

	/**
	 * Attempt to find module projects by loading timodule.xml and manifest files
	 */
	private loadModules () {
		const rootPath = workspace.rootPath;
		if (!rootPath) {
			return;
		}
		const paths = [
			path.join(rootPath),
			path.join(rootPath, 'android'),
			path.join(rootPath, 'ios'),
			path.join(rootPath, 'iphone'),
			path.join(rootPath, 'windows'),
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
	private loadModuleAt (modulePath) {
		if (utils.directoryExists(modulePath)) {
			const timodulePath = path.join(modulePath, TIMODULEXML_FILENAME);
			const manifestPath = path.join(modulePath, MANIFEST_FILENAME);

			if (!utils.fileExists(timodulePath)) {
				return;
			}

			const fileData = fs.readFileSync(timodulePath, 'utf-8');
			const parser = new xml2js.Parser();
			let json;
			parser.parseString(fileData, (err, result) => {
				if (!err) {
					json = result;
				}
			});
			if (json && json['ti:module']) {

				if (!fs.existsSync(manifestPath)) {
					return;
				}

				const manifest: any = {
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
