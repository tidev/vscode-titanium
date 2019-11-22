import { ConfigurationChangeEvent, ConfigurationTarget, ExtensionContext, Uri, workspace } from 'vscode';
import { ExtensionId } from './constants';
import { ExtensionContainer } from './container';

export class Configuration {
	public static configure (context: ExtensionContext) {
		context.subscriptions.push(
			workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration)
		);
	}

	public get<T> (section?: string, resource?: Uri, defaultValue?: T) {
		return defaultValue === undefined
			? workspace
				.getConfiguration(section === undefined ? undefined : ExtensionId, resource!)
				.get<T>(section === undefined ? ExtensionId : section)!
			: workspace
				.getConfiguration(section === undefined ? undefined : ExtensionId, resource!)
				.get<T>(section === undefined ? ExtensionId : section, defaultValue)!;
	}

	public update (section: string, value: any, target: ConfigurationTarget, resourece?: Uri) {
		return workspace
			.getConfiguration(ExtensionId, target === ConfigurationTarget.Global ? undefined : resourece!)
			.update(section, value, target);
	}

	private onConfigurationChanged (e: ConfigurationChangeEvent) {
		ExtensionContainer.resetConfig();
	}
}

export const configuration = new Configuration();
export * from './types/config';
