import { execFile } from 'child_process';
import * as vscode from 'vscode';
import { normalizeIOSOrganizations, scanIOSOrganizations } from '../common/iosCertificates';
import { IosCert } from '../types/common';

const setting = 'titanium.ios.organizations';
const scanningContext = 'titanium:certificates:scanning';
let scanning = false;

/**
 * Refreshes the CLI certificate inventory without a shell or access to private keys.
 *
 * @returns {Promise<IosCert[]>} Development and distribution certificates in all discovered keychains
 */
export async function loadIOSCertificates (): Promise<IosCert[]> {
	return new Promise((resolve, reject) => {
		execFile('ti', [ 'info', '-t', 'ios', '-o', 'json' ], {
			timeout: 120000,
			maxBuffer: 16 * 1024 * 1024
		}, (error, stdout) => {
			if (error) {
				reject(new Error('Unable to scan iOS certificates. Check that the Titanium CLI and Xcode are available, then try again.'));
				return;
			}
			try {
				const info = JSON.parse(stdout);
				const keychains = info?.ios?.certs?.keychains;
				if (!keychains || typeof keychains !== 'object' || Array.isArray(keychains)) {
					throw new Error('The Titanium CLI did not return an iOS certificate inventory.');
				}
				const certificates: IosCert[] = [];
				for (const keychain of Object.values(keychains) as { developer?: IosCert[]; distribution?: IosCert[] }[]) {
					for (const type of [ 'developer', 'distribution' ] as const) {
						if (keychain && Array.isArray(keychain[type])) {
							certificates.push(...keychain[type]);
						}
					}
				}
				resolve(certificates);
			} catch (parseError) {
				reject(parseError);
			}
		});
	});
}

/**
 * Imports missing organization aliases while retaining the user's names at every settings scope.
 *
 * @param {Function} loadCertificates - Fresh certificate inventory provider
 */
export async function scanCertificates (loadCertificates = loadIOSCertificates): Promise<void> {
	if (process.platform !== 'darwin') {
		await vscode.window.showWarningMessage('Scanning iOS certificates is available on macOS. You can still add organizations manually in Settings.');
		return;
	}
	if (!vscode.workspace.isTrusted || scanning) {
		return;
	}
	scanning = true;
	try {
		await vscode.commands.executeCommand('setContext', scanningContext, true);
		const destinations = [ {
			label: 'User settings',
			description: 'Recommended for your local signing certificates',
			target: vscode.ConfigurationTarget.Global
		} ];
		if (vscode.workspace.workspaceFolders?.length) {
			destinations.push({
				label: 'Workspace settings',
				description: 'Save organization names with this workspace',
				target: vscode.ConfigurationTarget.Workspace
			});
		}
		const destination = await vscode.window.showQuickPick(destinations, {
			title: 'Import organizations from certificates',
			placeHolder: 'Choose where to add organization names. Existing names will be kept.'
		});
		if (!destination) {
			return;
		}
		const result = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Scanning iOS signing certificates…'
		}, async () => scanIOSOrganizations(await loadCertificates()));
		const config = vscode.workspace.getConfiguration();
		const existing = normalizeIOSOrganizations(config.get<unknown>(setting));
		const additions = new Map<string, string>();
		let kept = 0;
		for (const [ teamId, names ] of result.organizations) {
			if (Object.prototype.hasOwnProperty.call(existing, teamId)) {
				kept++;
				continue;
			}
			let name: string | undefined;
			if (names.size === 1) {
				name = names.values().next().value;
			} else {
				name = await vscode.window.showQuickPick([ ...names ].sort(), {
					title: `Choose an organization name for team ${teamId}`,
					placeHolder: 'Certificates for this team contain different organization names. Escape skips this team.'
				});
			}
			if (name) {
				additions.set(teamId, name);
			}
		}
		// Read again after any prompts so edits made while scanning are never overwritten.
		const latestConfig = vscode.workspace.getConfiguration();
		const latestInspect = latestConfig.inspect<unknown>(setting);
		const latestValue = destination.target === vscode.ConfigurationTarget.Global ? latestInspect?.globalValue : latestInspect?.workspaceValue;
		let latest = normalizeIOSOrganizations(latestValue);
		const effective = normalizeIOSOrganizations(latestConfig.get<unknown>(setting));
		let added = 0;
		for (const [ teamId, name ] of additions) {
			if (!Object.prototype.hasOwnProperty.call(effective, teamId)) {
				latest = {
					...latest,
					[teamId]: name
				};
				added++;
			} else {
				kept++;
			}
		}
		if (added || (latestValue !== undefined && JSON.stringify(latestValue) !== JSON.stringify(latest))) {
			await latestConfig.update(setting, latest, destination.target);
		}
		vscode.window.showInformationMessage(`Certificate scan: added ${added} organizations; kept ${kept} existing team names; skipped ${result.skipped} unusable certificates.`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Could not import certificate organizations. ${message}`);
	} finally {
		scanning = false;
		await vscode.commands.executeCommand('setContext', scanningContext, false);
	}
}
