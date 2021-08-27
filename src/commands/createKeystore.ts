import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import Appc from '../appc';
import { ExtensionContainer } from '../container';
import { ValidatorResponse, WebviewWizard, WizardDefinition, WizardPageSectionDefinition } from '@redhat-developer/vscode-wizard';
import { PerformFinishResponse } from '@redhat-developer/vscode-wizard/lib/IWizardWorkflowManager';
import { getValidWorkspaceFolders, quickPick } from '../quickpicks';
import { BUTTONS, SEVERITY } from '@redhat-developer/vscode-wizard/lib/WebviewWizard';
import { KeystoreInfo } from '../types/common';
import { CommandBuilder } from '../tasks/commandBuilder';
import { CommandError } from 'src/common/utils';

export async function createKeystore (): Promise<KeystoreInfo> {

	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve, reject) => {
		interface KeystoreCreationProps {
			storeInformation: boolean;
			// Keystore details
			password: string;
			confirmPassword: string;
			// Key Pair details
			alias: string;
			validity: string;
			// Certificate details
			name: string;
			org: string;
			orgUnit: string;
			city: string;
			state: string;
			country: string;
		}

		let folder: string;
		const choices = [
			{
				id: 'browse',
				label: 'Browse for location'
			}
		];

		for (const workspaceFolder of await getValidWorkspaceFolders()) {
			choices.push({
				id: workspaceFolder.folder.uri.fsPath,
				label: workspaceFolder.folder.name,
			});
		}

		const choice = await quickPick(choices, { placeHolder: 'Select an open project to create the keystore in or browse for folder' }, { forceShow: true });

		if (choice.id === 'browse') {
			const selection = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });

			if (!selection) {
				await vscode.window.showErrorMessage('No folder was selected');
				return;
			}

			folder = selection[0].fsPath;
		} else {
			folder = choice.id;
		}

		const keystorePath = path.join(folder, 'keystore');

		if (await fs.pathExists(keystorePath)) {
			vscode.window.showErrorMessage(`Keystore already exists at ${keystorePath}. Please delete it or choose a new location`);
			return reject();
		}

		const def: WizardDefinition = {
			title: 'Create Keystore',
			description: 'Create a Keystore',
			hideWizardHeader: true,
			buttons: [ { id: BUTTONS.FINISH, label: 'Create' } ],
			pages: [
				{
					id: 'create',
					title: '',
					description: '',
					fields: [
						{
							id: 'store',
							label: 'Store Keystore information',
							description: 'This information is securely stored on your machine',
							childFields: [
								{
									id: 'storeInformation',
									type: 'checkbox',
									label: ''
								}
							]
						},
						{
							id: 'keystore',
							label: 'Keystore Details',
							childFields: [
								{
									id: 'password',
									type: 'password',
									label: 'Keystore Password'
								},
								{
									id: 'confirmPassword',
									type: 'password',
									label: 'Confirm Keystore Password'
								}
							]
						},
						{
							id: 'keypair',
							label: 'Key Pair Details',
							childFields: [
								{
									id: 'alias',
									type: 'textbox',
									label: 'Alias'
								},
								{
									id: 'validity',
									type: 'number',
									label: 'Validity (years)',
									initialValue: '25'
								}
							]
						},
						{
							id: 'certificate',
							label: 'Certificate Details',
							childFields: [
								{
									id: 'name',
									type: 'textbox',
									label: 'First and Last Name'
								},
								{
									id: 'orgUnit',
									type: 'textbox',
									label: 'Organizational Unit'
								},
								{
									id: 'org',
									type: 'textbox',
									label: 'Organization'
								},
								{
									id: 'city',
									type: 'textbox',
									label: 'City or Locality'
								},
								{
									id: 'state',
									type: 'textbox',
									label: 'State or Province'
								},
								{
									id: 'country',
									type: 'textbox',
									label: 'Country Code (XX)'
								}
							]
						}
					],
					validator (parameters: KeystoreCreationProps) {
						const response: ValidatorResponse = {
							items: []
						};

						// Validate matching passwords
						const password = parameters.password;
						const confirmPassword = parameters.confirmPassword;

						// eslint-disable-next-line security/detect-possible-timing-attacks
						if (password !== confirmPassword) {
							response.items.push({
								template: {
									id: 'confirmPasswordValidation',
									content: 'Keystore password and confirmation do not match'
								},
								severity: SEVERITY.ERROR
							});
						}

						const validity = parseInt(parameters.validity, 10);
						if (validity && (!Number.isInteger(validity) || validity <= 0)) {
							response.items.push({
								template: {
									id: 'validityValidation',
									content: 'Validity must be a whole number above 0'
								},
								severity: SEVERITY.ERROR
							});
						}

						const country = parameters.country;
						if (country && country.length > 2) {
							response.items.push({
								template: {
									id: 'countryValidation',
									content: 'Country must be in a 2 character country code format'
								},
								severity: SEVERITY.ERROR
							});
						}

						return response;
					}
				}
			],
			workflowManager: {
				canFinish(wizard: WebviewWizard, data: KeystoreCreationProps): boolean {
					// Validate that all the fields have been provided
					let canFinish = true;
					const { fields } = def.pages[0];
					for (const field of fields) {
						for (const { id, type } of (field as WizardPageSectionDefinition).childFields) {
							if (type !== 'checkbox' && !data[id as keyof KeystoreCreationProps]) {
								canFinish = false;
							}
						}
					}

					return canFinish;
				},
				async performFinish (wizard: WebviewWizard, data: KeystoreCreationProps): Promise<PerformFinishResponse|null> {
					const keytool = Appc.getKeytoolPath();
					if (!keytool) {
						return null;
					}

					// Validity has to be specified in days
					const validity =  parseInt(data.validity, 10) * 365;
					try {
						const commandInfo = CommandBuilder
							.create(keytool, '-genkeypair', '-keyalg', 'RSA', '-validity', `${validity}`)
							.addEnvironmentArgument('-alias', data.alias)
							.addEnvironmentArgument('-dname', `CN=${data.name},OU=${data.orgUnit},O=${data.org},L=${data.city},ST=${data.state},C=${data.country}`, true)
							.addEnvironmentArgument('-keypass', data.password, false, 'KEYPASS')
							.addEnvironmentArgument('-storepass', data.password, false, 'KEYPASS')
							.addEnvironmentArgument('-keystore', keystorePath)
							.resolve();

						await ExtensionContainer.terminal.runInBackground(keytool, commandInfo.args, { env: commandInfo.environment });

						vscode.window.showInformationMessage('Keystore created successfully');
					} catch (error) {
						if (error instanceof CommandError) {
							// eslint-disable-next-line promise/catch-or-return
							vscode.window.showErrorMessage('There was an error creating the keystore', 'View')
								.then(view => {
									if (view) {
										const output = vscode.window.createOutputChannel('Titanium - Keystore creation');
										output.appendLine((error as CommandError).command);
										output.appendLine((error as CommandError).output || '');
										output.show();
									}
									return;
								});
						}

						reject(error);
						return {
							success: false,
							close: false,
							templates: [],
							returnObject: {}
						};
					}

					const storeProps = {
						location: keystorePath,
						alias: data.alias,
						password: data.password,
						privateKeyPassword: data.password
					};

					if (data.storeInformation) {
						await ExtensionContainer.context.secrets.store(keystorePath, JSON.stringify(storeProps));
					}

					resolve(storeProps);
					return null;
				}
			}
		};

		const wizard = new WebviewWizard('Create Keystore', 'Create Keystore', ExtensionContainer.context, def, new Map());
		wizard.open();
	});
}
