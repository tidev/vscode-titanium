import { InputBox } from 'vscode-extension-tester';
import { notificationExists, CommonUICreator } from './common';
import { expect } from 'chai';
import { AppCreateOptions, ModuleCreateOptions } from '../types';

/**
 * Wrapper around the project creation flow to make it slightly easier to test
 */
export class ProjectCreator extends CommonUICreator {

	public async createApp(options: AppCreateOptions): Promise<void> {
		// We need to configure the setting for the creation directory before running any commands
		await this.configureSetting('General', 'Default Creation Directory', options.folder);

		await this.workbench.executeCommand('Titanium: Create application');

		await this.setName(options.name);
		await this.setId(options.id);
		await this.setPlatforms(options.platforms);
		await this.setEnableServices(options.enableServices);
		await this.setFolder();

		try {
			await this.driver.wait(async () => {
				await this.driver.sleep(500);
				return notificationExists('Creating application');
			}, 10000);
		} catch (error) {
			// If this notification doesn't show then it's due to the command failing,
			// so lets scoop the output from the output view
			const text = await this.getErrorOutput();
			throw new Error(`Failed to create application, "Creating application" notification did not show. Output error was ${text}`);
		}

		try {
			await this.driver.wait(async () => {
				// We need to sleep here as there are times when the 'Creating application' notification
				// is still shown but is dismissed by the time we get the text in notificationExists and
				// causes errors to be thrown that can't be handled
				await this.driver.sleep(500);
				return notificationExists('Project created');
			}, 60000);
		} catch (error) {
			// If this notification doesn't show then it's due to the command failing,
			// so lets scoop the output from the output view
			const text = await this.getErrorOutput();
			throw new Error(`Failed to create application, "Project created" notification did not show. Output error was ${text}`);
		}
	}

	public async createModule (options: ModuleCreateOptions): Promise<void> {
		// We need to configure the setting for the creation directory before running any commands
		await this.configureSetting('General', 'Default Creation Directory', options.folder);

		await this.workbench.executeCommand('Titanium: Create module');

		// HACK: Need to figure out a better way to wait for the environment detection to finish,
		// maybe we should just have a notification for it?
		await this.driver.sleep(10000);

		await this.setName(options.name);
		await this.setId(options.id);
		await this.setPlatforms(options.platforms);
		await this.setFolder();

		// These come alphabetically
		if (options.platforms.includes('android')) {
			await this.setCodeBase('Android', options.codeBases.android || 'java');
		}

		if (options.platforms.includes('ios')) {
			await this.setCodeBase('iOS', options.codeBases.ios || 'objc');
		}

		try {
			await this.driver.wait(async () => {
				await this.driver.sleep(500);
				return notificationExists('Creating module');
			}, 10000);
		} catch (error) {
			// If this notification doesn't show then it's due to the command failing,
			// so lets scoop the output from the output view
			const text = await this.getErrorOutput();
			throw new Error(`Failed to create module, "Creating module" notification did not show. Output error was ${text}`);
		}

		try {
			await this.driver.wait(async () => {
				// We need to sleep here as there are times when the 'Creating module' notification
				// is still shown but is dismissed by the time we get the text in notificationExists and
				// causes errors to be thrown that can't be handled
				await this.driver.sleep(500);
				return notificationExists('Project created');
			}, 60000);
		} catch (error) {
			// If this notification doesn't show then it's due to the command failing,
			// so lets scoop the output from the output view
			const text = await this.getErrorOutput();
			throw new Error(`Failed to create module, "Project created" notification did not show. Output error was ${text}`);
		}

	}

	public async setEnableServices(enableServices: boolean): Promise<void> {
		const servicesText = enableServices ? 'Yes' : 'No';
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();
		expect(placeHolderText).to.equal('Enable services?', 'Did not show enable services prompt');

		await input.setText(servicesText);
		await input.confirm();
		await this.driver.sleep(100);
	}

	public async setFolder(): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();
		expect(placeHolderText).to.equal('Select where to create your project', 'Did not show folder selection');

		await input.setText('Default');
		await input.confirm();
	}

	public async setId(id: string): Promise<void> {
		const input = await InputBox.create();

		const message = await input.getMessage();
		expect(message).to.match(/Enter your (application|module) ID/, 'Did not show ID input');

		await input.setText(id);
		await input.confirm();
	}

	public async setName (name: string): Promise<void> {
		const input = await InputBox.create();

		const message = await input.getMessage();
		expect(message).to.match(/Enter your (application|module) name/, 'Did not show name input');

		await input.setText(name);
		await input.confirm();
	}

	public async setPlatforms(platforms: string[]): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();
		expect(placeHolderText).to.equal('Choose platforms', 'Did not show platform selection');

		const choices = await input.getQuickPicks();
		for (const choice of choices) {
			const text = await choice.getText();
			if (!platforms.includes(text.toLowerCase())) {
				await input.selectQuickPick(text);
				await this.driver.sleep(50);
			}
		}
		await input.confirm();
	}

	public async setCodeBase(platform: string, codeBase: string): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();
		expect(placeHolderText).to.equal(`Select ${platform} codebase`, `Did not show ${platform} codebase selection`);

		await input.setText(codeBase);
		await input.confirm();
		await this.driver.sleep(100);
	}
}
