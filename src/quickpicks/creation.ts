import * as semver from 'semver';
import { nameForPlatform, platforms } from '../utils';
import { CustomQuickPick, quickPick } from './common';
import { InteractionError } from '../commands';
import { ExtensionContainer } from '../container';
import { l10n } from 'vscode';

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
	const selected = await quickPick(choices, { canPickMany: true, placeHolder: l10n.t('Choose platforms') }, { forceShow: true });

	if (!selected.length) {
		throw new InteractionError(l10n.t('At least one platform must be selected'));
	}

	return selected.map((platform: CustomQuickPick) => platform.id);
}

export async function selectCodeBases(platforms: string[]): Promise<CodeBase|undefined> {
	const codeBases: CodeBase = {
		android: undefined,
		ios: undefined
	};

	const selectedSdk = ExtensionContainer.environment.selectedSdk();

	if (!selectedSdk) {
		return undefined;
	}

	// Support for this was only added in SDK 9.1.0
	if (semver.lt(selectedSdk.version, '9.1.0')) {
		return undefined;
	}

	if (platforms.includes('android')) {
		codeBases.android = (await quickPick<AndroidCodeBaseQuickPickItem>([ { id: 'java', label: 'Java' }, { id: 'kotlin', label: 'Kotlin' } ], { canPickMany: false, placeHolder: l10n.t('Select Android codebase') })).id;
	}

	if (platforms.includes('ios')) {
		codeBases.ios = (await quickPick<iOSCodeBaseQuickPickItem>([ { id: 'objc', label: 'Objective-C' }, { id: 'swift', label: 'Swift' } ], { canPickMany: false, placeHolder: l10n.t('Select iOS codebase') })).id;

	}

	return codeBases;
}
