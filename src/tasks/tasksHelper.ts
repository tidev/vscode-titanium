import * as vscode from 'vscode';
import { BuildTaskProvider } from './buildTaskProvider';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import { androidHelper, iOSHelper, Helpers } from './helpers';

export type TitaniumTaskNames = 'titanium-build' | 'titanium-package';

export type Platform = 'android' | 'ios';
export type ProjectType = 'app' | 'module';

export function registerTaskProviders (ctx: vscode.ExtensionContext): void {

	const helpers: Helpers = {
		android: androidHelper,
		ios: iOSHelper
	};

	ctx.subscriptions.push(
		vscode.tasks.registerTaskProvider(
			'titanium-build',
			new BuildTaskProvider(helpers)
		)
	);
}

export interface TaskExecutionContext {
	cancellationToken: vscode.CancellationToken;
	folder: vscode.WorkspaceFolder;
	terminal: TaskPseudoTerminal;
}

export interface TaskDefinitionBase extends vscode.TaskDefinition {
	buildOnly?: boolean;
	platform: Platform;
	projectDir: string;
	sdkVersion?: string;
	logLevel: string;
	projectType: ProjectType;
}

export interface AppBuildTaskDefinitionBase extends TaskDefinitionBase {
	deviceId?: string;
	target?: 'emulator' | 'device' | 'simulator';
}
