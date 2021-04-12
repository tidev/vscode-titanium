import { ActivityBar, BottomBarPanel, InputBox, Notification, Workbench, WebDriver, TextSetting, ViewControl, ViewSection } from 'vscode-extension-tester';
import { promisify } from 'util';
import  * as cp from 'child_process';
import * as path from 'path';
import { Target } from '../types';

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
	const center = await new Workbench().openNotificationsCenter();
	await center.clearAllNotifications();
	await center.getDriver().sleep(250);
	await center.close();
}

/**
 * Common class for classes that wrap UI functionality to extend
 */
export class CommonUICreator {
	protected driver: WebDriver;
	protected workbench: Workbench;

	constructor(driver: WebDriver) {
		this.driver = driver;
		this.workbench = new Workbench();
	}

	public async getErrorOutput (): Promise<string> {
		try {
			const outputView = await new BottomBarPanel().openOutputView();
			// TODO: do we need to make sure it's highlighted await outputView.selectChannel('Appcelerator');
			return await outputView.getText();
		} catch (error) {
			return 'Failed to obtain error output';
		}
	}

	public async openFolder (folder: string): Promise<void> {
		await this.workbench.executeCommand('extest open folder');
		const input = await InputBox.create();
		await input.setText(folder);
		await input.confirm();

		await new Promise((resolve) => {
			setTimeout(resolve, 2000);
		});
	}

	public async configureSetting(section: string, settingName: string, value: string): Promise<void> {
		const editor = await this.workbench.openSettings();

		const setting = await editor.findSetting(settingName, `Titanium › ${section}`) as TextSetting;
		await setting.setValue(value);
	}

	/**
	 * Waits for the Build explorer to be shown and for the build action to be active
	 *
	 * @returns {Promise<void>}
	 * @memberof CommonUICreator
	 */
	public async waitForEnvironmentDetectionCompletion(): Promise<void> {
		const tiActivity = await this.getActivityView();
		const view  = await tiActivity.openView();
		const content = await view.getContent();

		await this.driver.wait(async () => {
			try {
				const sections = await content.getSections();
				let section: ViewSection|undefined;
				for (const sec of sections) {
					const title = await sec.getTitle();
					if (title.toLowerCase().includes('build')) {
						section = sec;
						continue;
					}
				}

				if (!section || !section.isDisplayed()) {
					return false;
				}

				let active = false;
				const actions = await section.getActions();
				for (const action of actions) {
					const label = await action.getLabel();
					if (label.toLowerCase().includes('build')) {
						active = true;
					}
				}
				return active;
			} catch (error) {
				// ignore error while we're waiting for the section to load
			}
		}, 60000);
	}

	/**
	 * Waits for the Get Started view to be shown and active in the tooling installed but no open project state
	 *
	 * @returns {Promise<void>}
	 * @memberof CommonUICreator
	 */
	public async waitForGetStarted (): Promise<void> {
		const tiActivity = await this.getActivityView();
		const view  = await tiActivity.openView();
		const content = await view.getContent();

		await this.driver.wait(async () => {
			try {
				const sections = await content.getSections();
				let section: ViewSection|undefined;
				for (const sec of sections) {
					const title = await sec.getTitle();
					if (title.toLowerCase().includes('get started')) {
						section = sec;
						continue;
					}
				}

				if (!section || !section.isDisplayed()) {
					return false;
				}

				const welcomeContent = await section.findWelcomeContent();

				if (!welcomeContent) {
					return false;
				}

				const welcomeText = await welcomeContent.getTextSections();
				console.log(welcomeText);
				if (welcomeText.find(text => text.toLowerCase().includes('titanium project open'))) {
					return true;
				}
			} catch (error) {
				// ignore error while we're waiting for the section to load
			}
		}, 30000);
	}

	/**
	 * Looks for and returns an instance of the Titanium activity view
	 *
	 * @returns {Promise<ViewControl>}
	 * @memberof CommonUICreator
	 */
	public async getActivityView (): Promise<ViewControl> {
		const activityBar = new ActivityBar();
		const tiActivity = await this.driver.wait<ViewControl>(async () => {
			const activity = await activityBar.getViewControl('Titanium');
			if (!activity?.isDisplayed()) {
				return false;
			}
			return activity;
		}, 5000);
		return tiActivity;
	}
}

/**
 * Returns the path to the fixtures directory
 *
 * @returns {String}
 */
export function getFixturesDirectory (): string {
	return path.join(__dirname, '../../../..', 'src', 'test', 'integration', 'fixtures');
}

/**
 * Returns string with capitalized first letter
 * This should eventually be replaced with the one used from `src/utils.ts` but as that references
 * the `vscode` package we can't do that.
 *
 * @param {String} s - string.
 * @returns {String}
 */
export function capitalizeFirstLetter (s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
