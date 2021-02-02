import { updates } from 'titanium-editor-commons';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import * as vscode from 'vscode';
import appc, { Appc } from './appc';
import { Config, configuration } from './configuration';
import { GlobalState, VSCodeCommands } from './constants';
import { HelpExplorer } from './explorer/helpExplorer';
import DeviceExplorer from './explorer/tiExplorer';
import project from './project';
import Terminal from './terminal';
import { getNodeSupportedVersion } from './utils';

export class ExtensionContainer {
	private static _appc: Appc;
	private static _buildExplorer: DeviceExplorer;
	private static _config: Config | undefined;
	private static _context: vscode.ExtensionContext;
	private static _helpExplorer: HelpExplorer;
	private static _runningTask: vscode.TaskExecution|undefined;
	private static _terminal: Terminal;
	private static _updateInfo: UpdateInfo[];

	public static inititalize (context: vscode.ExtensionContext, config: Config): void {
		this._appc = appc;
		this._config = config;
		this._context = context;
	}

	static get appc (): Appc {
		return this._appc;
	}

	static get config (): Config {
		if (this._config === undefined) {
			this._config = configuration.get<Config>();
		}
		return this._config;
	}

	static get context (): vscode.ExtensionContext {
		return this._context;
	}

	static get terminal (): Terminal {
		if (this._terminal === undefined) {
			this._terminal = new Terminal('Appcelerator');
		}
		return this._terminal;
	}

	public static resetConfig (): void {
		this._config = undefined;
	}

	static set runningTask (task: vscode.TaskExecution|undefined) {
		this._runningTask = task;
	}

	static get runningTask (): vscode.TaskExecution|undefined {
		return this._runningTask;
	}

	static set buildExplorer (buildExplorer: DeviceExplorer) {
		this._buildExplorer = buildExplorer;
	}

	static get buildExplorer (): DeviceExplorer {
		return this._buildExplorer;
	}

	static set helpExplorer (helpExplorer: HelpExplorer) {
		this._helpExplorer = helpExplorer;
	}

	static get helpExplorer (): HelpExplorer {
		return this._helpExplorer;
	}

	/**
	 * Updates the property in both VS Code context, for when clauses used in the package.json, and
	 * also the globalSate for the ExtensionContext
	 *
	 * @param {GlobalState} stateName - State value to change
	 * @param {T} value - Value to be changed
	 */
	static setContext<T>(stateName: GlobalState, value: T): void {
		vscode.commands.executeCommand(VSCodeCommands.SetContext, stateName, value);
		ExtensionContainer.context.globalState.update(stateName, value);
	}

	/**
	 * Gets the supported SDK version for a project and then retrieves updates based
	 * on that.
	 *
	 * @static
	 * @param {boolean} [force] - Retrieve updates even if they have already been retrieved
	 * @returns {Promise<UpdateInfo[]>}
	 * @memberof ExtensionContainer
	 */
	static async getUpdates (force?: boolean): Promise<UpdateInfo[]> {
		if (!force && this._updateInfo) {
			return this._updateInfo;
		}

		let supportedVersions;
		try {
			supportedVersions = await getNodeSupportedVersion(project.sdk()[0]);
		} catch (error) {
			// ignore
		}

		this._updateInfo = await updates.checkAllUpdates({ nodeJS: supportedVersions });

		if (this._updateInfo?.length) {
			this.setContext(GlobalState.HasUpdates, true);
		}

		return this._updateInfo;
	}
}
