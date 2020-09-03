import * as utils from '../../utils';

import { quickPick, CustomQuickPick } from '../common';
import { selectAndroidDevice, selectAndroidEmulator } from './android';
import { selectiOSDevice, selectiOSSimulator, selectiOSSimulatorVersion } from './ios';

export async function selectDevice (platform: string, target: string): Promise<CustomQuickPick> {
	if (platform === 'android' && target === 'emulator') {
		return selectAndroidEmulator();
	} else if (platform === 'android' && target === 'device') {
		return selectAndroidDevice();
	} else if (platform === 'ios' && target === 'device') {
		return selectiOSDevice();
	} else if (platform === 'ios' && target === 'simulator') {
		const simVersion = await selectiOSSimulatorVersion();
		return selectiOSSimulator(simVersion.label);
	} else {
		throw new Error(`Unsupported platform and combination target ${platform} + ${target}`);
	}
}

export function selectBuildTarget (platform: string): Promise<CustomQuickPick>  {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => !/^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}

export function selectDistributionTarget (platform: string): Promise<CustomQuickPick>  {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => /^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}
