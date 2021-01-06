import * as vscode from 'vscode';
import appc, { Appc } from './appc';
import { Config, configuration } from './configuration';
import { GlobalState, VSCodeCommands } from './constants';
import DeviceExplorer from './explorer/tiExplorer';
import UpdateExplorer from './explorer/updateExplorer';
import Terminal from './terminal';

export class ExtensionContainer {
	private static _appc: Appc;
	private static _buildExplorer: DeviceExplorer;
	private static _config: Config | undefined;
	private static _context: vscode.ExtensionContext;
	private static _runningTask: vscode.TaskExecution|undefined;
	private static _terminal: Terminal;
	private static _updateExplorer: UpdateExplorer;

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

	static set updateExplorer (updateExplorer: UpdateExplorer) {
		this._updateExplorer = updateExplorer;
	}

	static get updateExplorer (): UpdateExplorer {
		return this._updateExplorer;
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
}
