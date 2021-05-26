import * as utils from '../../utils';
import { Commands } from '../../commands/common';
import { commands, QuickPickOptions } from 'vscode';
import { quickPick, CustomQuickPick } from '../common';
import { selectAndroidDevice, selectAndroidEmulator } from './android';
import { selectiOSDevice, selectiOSSimulator } from './ios';
import { Platform } from 'src/types/common';

export interface DeviceQuickPickItem extends CustomQuickPick {
	id: string;
	label: string;
	udid: string;
}

export async function deviceQuickPick (deviceList: DeviceQuickPickItem[], quickPickOptions: QuickPickOptions): Promise<DeviceQuickPickItem> {
	if (!deviceList.length) {
		quickPickOptions.placeHolder = `${quickPickOptions.placeHolder}. None detected, refresh device information?`;
	}

	deviceList.push({
		id: 'refresh',
		label: 'Refresh Devices',
		udid: 'refresh'
	});
	return quickPick<DeviceQuickPickItem>(deviceList, quickPickOptions, { forceShow: true });
}

export async function selectDevice (platform: string, target: string, iOSSimulatorVersion?: string): Promise<DeviceQuickPickItem> {
	let deviceChoice;
	if (platform === 'android' && target === 'emulator') {
		deviceChoice = await selectAndroidEmulator();
	} else if (platform === 'android' && target === 'device') {
		deviceChoice = await selectAndroidDevice();
	} else if (platform === 'ios' && target === 'device') {
		deviceChoice = await selectiOSDevice();
	} else if (platform === 'ios' && target === 'simulator') {
		deviceChoice = await selectiOSSimulator(iOSSimulatorVersion);
	} else {
		throw new Error(`Unknown platform "${platform}" or target "${target}"`);
	}

	if (deviceChoice.id === 'refresh') {
		await commands.executeCommand(Commands.RefreshExplorer);
		return selectDevice(platform, target, iOSSimulatorVersion);
	}

	return deviceChoice;
}

export function selectBuildTarget (platform: Platform): Promise<CustomQuickPick>  {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => !/^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}

export function selectDistributionTarget (platform: Platform): Promise<CustomQuickPick>  {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => /^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}
