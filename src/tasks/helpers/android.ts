import { TaskExecutionContext, BuildTaskDefinitionBase } from '../tasksHelper';
import { TaskHelper } from './base';

export interface AndroidBuildDefinition extends BuildTaskDefinitionBase {
	keystore?: string;
	platform?: 'android';
}

export class AndroidHelper extends TaskHelper {

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: AndroidBuildDefinition): Promise<string> {
		throw new Error('Unimplemented');
	}

	public async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskDefinitionBase): Promise<string> {
		throw new Error('Unimplemented');
	}

}

export const androidHelper = new AndroidHelper();
