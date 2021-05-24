import { updates } from 'titanium-editor-commons';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import * as vscode from 'vscode';
import appc, { Appc } from './appc';
import { Config, configuration } from './configuration';
import { GlobalState, VSCodeCommands, WorkspaceState } from './constants';
import { HelpExplorer } from './explorer/helpExplorer';
import DeviceExplorer from './explorer/tiExplorer';
import { startup } from './extension';
import { AppBuildTaskTitaniumBuildBase } from './tasks/buildTaskProvider';
import { isDistributionAppBuild, RunningTask } from './tasks/tasksHelper';
import { AppPackageTaskTitaniumBuildBase } from './tasks/packageTaskProvider';
import { Project } from './project';
import { generateCompletions } from './providers';
import { getValidWorkspaceFolders } from './quickpicks/common';
import Terminal from './terminal';
import { getNodeSupportedVersion } from './utils';

export class ExtensionContainer {
	private static _appc: Appc;
	private static _buildExplorer: DeviceExplorer;
	private static _config: Config | undefined;
	private static _context: vscode.ExtensionContext;
	private static _helpExplorer: HelpExplorer;
	private static _projects: Map<string, Project> = new Map();
	private static _runningTask: vscode.TaskExecution|undefined;
	private static _runningTasks: Map<string, RunningTask> = new Map();
	private static _terminal: Terminal;
	private static _updateInfo: UpdateInfo[];
	private static _recentBuilds: Map<string, AppBuildTaskTitaniumBuildBase|AppPackageTaskTitaniumBuildBase>;

	public static inititalize (context: vscode.ExtensionContext, config: Config): void {
		this._appc = appc;
		this._config = config;
		this._context = context;
		this._recentBuilds = new Map(context.workspaceState.get(WorkspaceState.RecentBuilds) || []);
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

	public static resetConfig (configEvent: vscode.ConfigurationChangeEvent): void {
		this._config = configuration.get<Config>();

		// if the config change is for the useTi setting we need to kick off the startup again to
		// perform environment validation
		if (configEvent.affectsConfiguration('titanium.general.useTi')) {
			startup();
		}
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

	static get recentBuilds (): Map<string, AppBuildTaskTitaniumBuildBase|AppPackageTaskTitaniumBuildBase> {
		if (!this._recentBuilds) {
			this._recentBuilds = new Map(this._context.workspaceState.get(WorkspaceState.RecentBuilds) || []);
		}
		return this._recentBuilds;
	}

	static get projects (): Map<string, Project> {
		return this._projects;
	}

	static get runningTasks (): Map<string, RunningTask> {
		return this._runningTasks;
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
		this._context.globalState.update(stateName, value);
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
			supportedVersions = await getNodeSupportedVersion();
		} catch (error) {
			// ignore
		}

		this._updateInfo = await updates.checkAllUpdates({ nodeJS: supportedVersions }, !ExtensionContainer.isUsingTi());

		if (this._updateInfo?.length) {
			this.setContext(GlobalState.HasUpdates, true);
		}

		return this._updateInfo;
	}

	static isUsingTi (): boolean {
		return this.config.general.useTi;
	}

	/**
	 * Adds a build definition into the list of recent builds. The list is capped at 5, and uniqueness
	 * is determined by the deviceId for device/emulator builds and the target for distribution builds.
	 * The list is stored as workspace state so will be unique to each project/workspace
	 *
	 * @static
	 * @param {AppBuildTaskTitaniumBuildBase|AppPackageTaskTitaniumBuildBase} buildData - The build definition to store
	 * @memberof ExtensionContainer
	 */
	static addRecentBuild (buildData: AppBuildTaskTitaniumBuildBase|AppPackageTaskTitaniumBuildBase): void {
		// We only want to store a maximum of 1 of each
		const key = isDistributionAppBuild(buildData) ? buildData.target : buildData.deviceId;

		if (!key) {
			// This should pretty much never happen as addRecentBuild is called after collecting
			// all the build data. But ignore this build definition just in case
			return;
		}

		if (this._recentBuilds.has(key)) {
			this._recentBuilds.delete(key);
		} else if (this._recentBuilds.size >= 5) {
			const { value: [ key ] } = this._recentBuilds.entries().next();

			this._recentBuilds.delete(key);
		}

		this._recentBuilds.set(key, buildData);
		this.context.workspaceState.update(WorkspaceState.RecentBuilds, Array.from(this._recentBuilds));
		this._buildExplorer.refreshRecentBuilds();
	}

	static async loadProjects(): Promise<void> {
		for (const { folder, type } of await getValidWorkspaceFolders({ apps: true, modules: true })) {
			const filePath = folder.uri.fsPath;
			if (this._projects.has(filePath)) {
				continue;
			}
			const project = new Project(filePath, type);
			this._projects.set(filePath, project);

			await project.load();
			if (project.type === 'app') {
				generateCompletions(false, project)
					.catch(() => {
						// ignore
					});
			}
		}
	}
}
