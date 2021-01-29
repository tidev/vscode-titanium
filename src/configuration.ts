import { ConfigurationChangeEvent, ConfigurationTarget, ExtensionContext, Uri, workspace } from 'vscode';
import { ExtensionName } from './constants';
import { ExtensionContainer } from './container';

export class Configuration {
	public static configure (context: ExtensionContext): void {
		context.subscriptions.push(
			workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration) // eslint-disable-line @typescript-eslint/no-use-before-define
		);
	}

	public get<T> (section?: string, resource?: Uri, defaultValue?: T): T {
		return defaultValue === undefined
			? workspace
				.getConfiguration(section === undefined ? undefined : ExtensionName, resource!)
				.get<T>(section === undefined ? ExtensionName : section)!
			: workspace
				.getConfiguration(section === undefined ? undefined : ExtensionName, resource!)
				.get<T>(section === undefined ? ExtensionName : section, defaultValue)!;
	}

	public update (section: string, value: any, target: ConfigurationTarget, resourece?: Uri): Thenable<void> {
		return workspace
			.getConfiguration(ExtensionName, target === ConfigurationTarget.Global ? undefined : resourece!)
			.update(section, value, target);
	}

	private onConfigurationChanged (e: ConfigurationChangeEvent): void {
		ExtensionContainer.resetConfig();
	}
}

export const configuration = new Configuration();
export * from './types/config';
