import * as semver from 'semver';
import Appc from '../appc';
import { nameForPlatform, platforms } from '../utils';
import { CustomQuickPick, quickPick } from './common';
import { appc } from 'titanium-editor-commons/updates';
import { ExtensionContainer } from '../container';

export interface CodeBase {
	android?: 'java' | 'kotlin'
	ios?: 'objc' | 'swift'
}

interface AndroidCodeBaseQuickPickItem extends CustomQuickPick {
	id: 'java' | 'kotlin'
}

interface iOSCodeBaseQuickPickItem extends CustomQuickPick {
	id: 'objc' | 'swift'
}

export async function selectPlatforms (): Promise<string[]> {
	const choices: CustomQuickPick[] = platforms().map(platform => ({ label: nameForPlatform(platform), id: platform, picked: true }));
	const selected = await quickPick(choices, { canPickMany: true, placeHolder: 'Choose platforms' });
	return selected.map((platform: CustomQuickPick) => platform.id);
}

export async function selectCodeBases(platforms: string[]): Promise<CodeBase|undefined> {
	const codeBases: CodeBase = {
		android: undefined,
		ios: undefined
	};

	const selectedSdk = Appc.selectedSdk();

	if (!selectedSdk) {
		return undefined;
	}

	// Support for this was only added in SDK 9.1.0
	if (semver.lt(selectedSdk.version, '9.1.0')) {
		return undefined;
	}

	if (!ExtensionContainer.isUsingTi()) {
		// CLI 8.1.1 did not correctly handle the --ios-code-base option, so only ask for codebase
		// options if they're using 8.1.1 or above
		const selectedCLI = await appc.core.checkInstalledVersion();

		if (!selectedCLI) {
			return;
		}

		if (semver.lt(selectedCLI, '8.1.1')) {
			return undefined;
		}
	}

	if (platforms.includes('android')) {
		codeBases.android = (await quickPick<AndroidCodeBaseQuickPickItem>([ { id: 'java', label: 'Java' }, { id: 'kotlin', label: 'Kotlin' } ], { canPickMany: false, placeHolder: 'Select Android codebase' })).id;
	}

	if (platforms.includes('ios')) {
		codeBases.ios = (await quickPick<iOSCodeBaseQuickPickItem>([ { id: 'objc', label: 'Objective-C' }, { id: 'swift', label: 'Swift' } ], { canPickMany: false, placeHolder: 'Select iOS codebase' })).id;

	}

	return codeBases;
}
