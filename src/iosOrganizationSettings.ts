import { ConfigurationTarget, window, workspace } from 'vscode';
import { normalizeIOSOrganizations } from './common/iosCertificates';

/** Converts the old JSON string at its original scope before the Settings table is edited. */
export async function migrateIOSOrganizationSettings (): Promise<void> {
	const setting = 'titanium.ios.organizations';
	const config = workspace.getConfiguration();
	const inspect = config.inspect<unknown>(setting);
	const scopes = [
		{
			value: inspect?.globalValue,
			target: ConfigurationTarget.Global
		},
		{
			value: inspect?.workspaceValue,
			target: ConfigurationTarget.Workspace
		}
	];
	for (const { value, target } of scopes) {
		if (value === undefined) {
			continue;
		}
		try {
			const normalized = normalizeIOSOrganizations(value);
			if (JSON.stringify(value) !== JSON.stringify(normalized)) {
				await config.update(setting, normalized, target);
			}
		} catch {
			window.showWarningMessage('Titanium could not convert an old iOS organizations setting. Review titanium.ios.organizations in Settings (JSON); the original value was preserved.');
		}
	}
}
