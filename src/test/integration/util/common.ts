import { Notification, Workbench } from 'vscode-extension-tester';
import  * as cp from 'child_process';
import { promisify } from 'util';

const exec = promisify(cp.exec);

export async function testSetup(): Promise<void> {
	try {
		await exec('appc');
	} catch (error) {
		console.error('Unable to find appcelerator CLI. Please install it');
		process.exit(1);
	}
}

/**
 * Check if a notification exists
 *
 * @param {string} text - text that the notification will contain.
 * @returns {(Promise<Notification | undefined>)}
 */
export async function notificationExists(text: string): Promise<Notification | undefined> {
	const notifications = await new Workbench().getNotifications();
	for (const notification of notifications) {
		const message = await notification.getMessage();
		if (message.indexOf(text) >= 0) {
			return notification;
		}
	}
}

/**
 * Parses the enabled targets out of a tiapp.xml file
 * @param {Object} tiapp - A tiapp representation from xml2js
 * @returns {String[]} Array of platforms
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePlatformsFromTiapp (tiapp: any): string[] {
	return tiapp['deployment-targets'][0].target
		.filter((target: Target) => target._ === 'true')
		.map((target: Target) => target.$.device);
}

/**
 * Dismisses all notifications that are active in VS Code
 */
export async function dismissNotifications(): Promise<void> {
	const notifications = await new Workbench().getNotifications();
	for (const notification of notifications) {
		await notification.dismiss();
		await notification.getDriver().sleep(100);
	}
}
