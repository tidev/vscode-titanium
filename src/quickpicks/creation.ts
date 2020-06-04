import { nameForPlatform, platforms } from '../utils';
import { CustomQuickPick, quickPick } from './common';

export async function selectPlatforms (): Promise<string[]> {
	const choices: CustomQuickPick[] = platforms().map(platform => ({ label: nameForPlatform(platform), id: platform, picked: true }));
	const selected = await quickPick(choices, { canPickMany: true, placeHolder: 'Choose platforms' });
	return selected.map((platform: CustomQuickPick)  => platform.id);
}
