import { nameForPlatform, platforms } from '../utils';
import { quickPick } from './common';

export async function selectPlatforms () {
	const choices = platforms().map(platform => ({ label: nameForPlatform(platform), id: platform }));
	const selected = await quickPick(choices, { canPickMany: true, placeHolder: 'Choose platforms' });
	return selected.map(platform => platform.id);
}
