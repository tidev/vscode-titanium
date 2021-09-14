import { ActivityBar, BottomBarPanel, InputBox, Notification, Workbench, WebDriver, TextSetting, ViewControl, ViewSection, WelcomeContentButton, By, VSBrowser } from 'vscode-extension-tester';
import { promisify } from 'util';
import  * as cp from 'child_process';
import * as path from 'path';
import { Target } from '../types';

const exec = promisify(cp.exec);

export async function testSetup(): Promise<void> {

	function exit (reason: string) {
		console.error(reason);
		process.exit(1);
	}

	try {
		await exec('ti -v');
	} catch (error) {
		exit('Unable to find titanium CLI. Please install it');
	}

	try {
		await exec('alloy -v');
	} catch (error) {
		exit('Unable to find alloy CLI. Please install it');
	}

	try {
		const { stdout } = await exec('ti sdk list -o json');
		const sdks = JSON.parse(stdout);
		if (Object.keys(sdks.installed).length === 0) {
			exit('Unable to find any Titanium SDKs. Please install one');
		}
	} catch (error) {
		exit('Failed to lookup SDKs');
	}
}

/**
 * Check if a notification exists
 *
 * @param {string} text - text that the notification will contain.
 * @returns {(Promise<Notification | undefined>)}
 */
export async function notificationExists(text: string): Promise<Notification | undefined> {
	// lowercase the text to avoid requiring specific text
	text = text.toLowerCase();
	const notifications = await new Workbench().getNotifications();
	for (const notification of notifications) {
		try {
			const message = await notification.getMessage();
			if (message.toLowerCase().includes(text)) {
				return notification;
			}
		} catch (error) {
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
	try {
		await center.clearAllNotifications();
		await center.getDriver().sleep(250);
		await center.close();
	} catch (error) {
		// ignore
	}
}

let activityView: ViewControl|undefined;
/**
 * Common class for classes that wrap UI functionality to extend
 */
export class CommonUICreator {
	protected driver: WebDriver;
	public workbench: Workbench;
	public browser: VSBrowser;

	constructor(browser: VSBrowser) {
		this.browser = browser;
		this.driver = browser.driver;
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
		await this.browser.openResources(folder);

		await this.driver.sleep(2000);
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
		await this.trustWorkspace();
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
		await this.trustWorkspace();
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

					if (title.toLowerCase().includes('build')) {
						// The extension is already up and running, so lets just continue on
						return true;
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
				if (welcomeText.find(text => text.toLowerCase().includes('titanium project open'))) {
					return true;
				} else if (welcomeText.find(text => text.toLowerCase().includes('click below to install it'))) {
					// lets try and output what's missing...
					const buttons = await welcomeContent.getButtons();
					let installButton: WelcomeContentButton|undefined;
					for (const button of buttons) {
						const buttonText = await button.getText();
						if (buttonText.toLowerCase().includes('install')) {
							installButton = button;
						}
					}

					if (!installButton) {
						return false;
					}

					await installButton.click();

					await this.driver.wait(async () => {
						await this.driver.sleep(500);
						return notificationExists('please select');
					}, 45000);

					const input = await InputBox.create();
					const choices = await input.getQuickPicks();
					const items = [];
					for (const choice of choices) {
						items.push(await choice.getText());
					}

					throw new Error(`It looks like you dont have tooling installed, you are missing ${items}`);
				}
			} catch (error) {
				// ignore error while we're waiting for the section to load
				if (error instanceof Error && error.message?.includes('It looks')) {
					throw error;
				}
			}
		}, 120000);
	}

	public async reset(): Promise<void> {
		if (activityView) {
			await activityView.closeView();
		}
		const activityBar = new ActivityBar();
		const activity = await this.driver.wait<ViewControl>(async () => {
			const activityViews = await activityBar.getViewControls();
			const activity = activityViews[0];
			if (!activity?.isDisplayed()) {
				return false;
			}
			return activity;
		}, 10000);
		await activity.openView();
	}

	/**
	 * Looks for and returns an instance of the Titanium activity view
	 *
	 * @returns {Promise<ViewControl>}
	 * @memberof CommonUICreator
	 */
	public async getActivityView (): Promise<ViewControl> {
		if (activityView) {
			return activityView;
		}

		const activityBar = new ActivityBar();
		const tiActivity = await this.driver.wait<ViewControl>(async () => {
			const activity = await activityBar.getViewControl('Titanium');
			if (!activity?.isDisplayed()) {
				return false;
			}
			return activity;
		}, 10000);
		return activityView = tiActivity;
	}

	public async trustWorkspace(): Promise<void> {

		// First check if we've got a prompt displayed
		try {
			const dialog = await this.driver.findElement(By.className('monaco-dialog-box'));

			if (dialog) {
				const trustButton = await this.driver.findElement(By.xpath('.//a[starts-with(@title, "Yes")]'));
				if (trustButton) {
					await trustButton.click();
					return;
				}
			}
		} catch (error) {
			// dialog box doesnt always show, fallback to using the editor
		}

		try {
			await this.workbench.executeCommand('manage workspace trust');
			await this.driver.sleep(500);

			const title = await this.driver.findElement(By.className('workspace-trust-title-text'));
			const text = await title.getText();
			if (text.toLowerCase().includes('you trust') || text.toLowerCase().includes('is trusted')) {
				// already trusted!
				return;
			}

			const button = await this.driver.findElement(By.xpath('//div[@class="workspace-trust-limitations trusted"]//a'));
			await button.click();
		} catch (error) {
			// ignore
		}

	}
}

/**
 * Returns the path to the fixtures directory
 *
 * @returns {String}
 */
export function getIntegrationFixturesDirectory (): string {
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
