import { QuickPickOptions } from 'vscode';
import * as utils from '../../utils';

import { quickPick, CustomQuickPick } from '../common';
import { selectAndroidDevice, selectAndroidEmulator } from './android';
import { selectiOSDevice, selectiOSSimulator } from './ios';

export interface DeviceQuickPickItem extends CustomQuickPick {
	id: string;
	label: string;
	udid: string;
}

export async function deviceQuickPick (deviceList: DeviceQuickPickItem[], quickPickOptions: QuickPickOptions): Promise<DeviceQuickPickItem> {
	return quickPick(deviceList, quickPickOptions) as Promise<DeviceQuickPickItem>;
}

export async function selectDevice (platform: string, target: string, iOSSimulatorVersion?: string): Promise<DeviceQuickPickItem> {
	if (platform === 'android' && target === 'emulator') {
		return selectAndroidEmulator();
	} else if (platform === 'android' && target === 'device') {
		return selectAndroidDevice();
	} else if (platform === 'ios' && target === 'device') {
		return selectiOSDevice();
	} else if (platform === 'ios' && target === 'simulator') {
		return selectiOSSimulator(iOSSimulatorVersion);
	} else {
		throw new Error(`Unknown platform "${platform}" or target "${target}"`);
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
