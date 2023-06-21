import * as fs from 'fs-extra';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';

import detectIndent = require('detect-indent');
import { ExtensionContainer } from '../container';
import { enterAndroidKeystoreInfo, promptForWorkspaceFolder, selectiOSCertificate, selectiOSProvisioningProfile, yesNoQuestion } from '../quickpicks';
import { TitaniumTaskDefinitionBase } from '../tasks/commandTaskProvider';
import { nameForPlatform, nameForTarget } from '../utils';
import { DeviceNode, DistributeNode } from '../explorer/nodes';
import { AppBuildTaskDefinitionBase, ModuleBuildTaskDefinitionBase } from '../tasks/buildTaskProvider';
import { AppPackageTaskDefinitionBase } from '../tasks/packageTaskProvider';
import { ProjectType } from '../types/common';

function isAppBuild (type: ProjectType, task: Partial<TitaniumTaskDefinitionBase>): task is AppBuildTaskDefinitionBase {
	return type === 'app';
}

function isModuleBuild (type: ProjectType, task: Partial<TitaniumTaskDefinitionBase>): task is ModuleBuildTaskDefinitionBase {
	return type === 'module';
}

function isAppPackage (type: ProjectType, task: Partial<TitaniumTaskDefinitionBase>): task is AppPackageTaskDefinitionBase {
	return type === 'app';
}

export async function generateTask (node: DeviceNode|DistributeNode): Promise<void> {
	const { type, folder } = await promptForWorkspaceFolder({ apps: true, modules: false, placeHolder: vscode.l10n.t('Select a project to generate a task definition for') });

	const tasksFileLocation = path.join(folder.uri.fsPath, '.vscode', 'tasks.json');
	let fileContents;
	if (await fs.pathExists(tasksFileLocation)) {
		fileContents = await fs.readFile(tasksFileLocation, 'utf8');
	} else {
		fileContents = '{ "version" :"2.0.0", "tasks": [] }';
	}

	const project = ExtensionContainer.projects.get(folder.uri.fsPath);
	if (!project) {
		return;
	}

	const task: Partial<TitaniumTaskDefinitionBase> = {
		label: `Titanium - ${nameForPlatform(node.platform)} ${nameForTarget(node.targetId)}`,
		titaniumBuild: {
			platform: node.platform,
			projectType: type,
			projectDir: folder.uri.fsPath
		}
	};

	if (node instanceof DeviceNode && (isAppBuild(type, task) || isModuleBuild(type, task))) {
		task.type = 'titanium-build';
		task.titaniumBuild.deviceId = node.deviceId;
		task.titaniumBuild.target = node.targetId;
		if (node.platform === 'ios' && node.target === 'device') {
			const selectSigning = await yesNoQuestion({ placeHolder: vscode.l10n.t('Select signing information?') });

			if (selectSigning) {
				const certificate = await selectiOSCertificate('run');
				const provisioningProfile = await selectiOSProvisioningProfile(certificate, node.target, project.appId());

				task.titaniumBuild.ios = {
					certificate: certificate.fullname,
					provisioningProfile: provisioningProfile.uuid
				};
			}
		}
	} else if (node instanceof DistributeNode && isAppPackage(type, task)) {
		task.type = 'titanium-package';
		task.titaniumBuild.target = node.targetId;
		if (node.platform === 'ios') {
			const selectSigning = await yesNoQuestion({ placeHolder: vscode.l10n.t('Select signing information?') });

			if (selectSigning) {
				const certificate = await selectiOSCertificate('package');
				const provisioningProfile = await selectiOSProvisioningProfile(certificate, node.targetId, project.appId());

				task.titaniumBuild.ios = {
					certificate: certificate.fullname,
					provisioningProfile: provisioningProfile.uuid
				};
			}
		} else if (node.platform === 'android') {
			const selectKeystore = await yesNoQuestion({ placeHolder: vscode.l10n.t('Select keystore information?') });

			if (selectKeystore) {
				const keystoreInfo = await enterAndroidKeystoreInfo(folder);
				task.titaniumBuild.android = {
					keystore: {
						alias: keystoreInfo.alias,
						location: keystoreInfo.location
					}
				};
			}
		}
	}

	try {
		const indent = detectIndent(fileContents);
		const formattingOptions: jsonc.FormattingOptions = { insertSpaces: indent.type === 'space', tabSize: indent.amount };

		const edits = jsonc.modify(fileContents, [ 'tasks', 0 ], task, { isArrayInsertion: true, formattingOptions });
		const editedContents = jsonc.applyEdits(fileContents, edits);
		await fs.writeFile(tasksFileLocation, editedContents);

		const choice = await vscode.window.showInformationMessage(vscode.l10n.t('Generated task {0}', task.label), { id: 'show', title: vscode.l10n.t('Show') });

		if (choice?.id === 'show') {
			const document = await vscode.workspace.openTextDocument(tasksFileLocation);
			await vscode.window.showTextDocument(document);
		}
	} catch (error) {
		vscode.window.showErrorMessage(vscode.l10n.t('Failed to generate task {0}', error as string));
	}
}
