import { Notification, Workbench } from 'vscode-extension-tester';

export async function testSetup(): Promise<void> {
	// check appc
	// check session
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

export function parsePlatformsFromTiapp (tiapp: any): string[] {
	return tiapp['deployment-targets'][0].target
		.filter((target: Target) => target._ === 'true')
		.map((target: Target) => target.$.device);
}
