import { BottomBarPanel, InputBox } from 'vscode-extension-tester';
import { notificationExists, CommonUICreator } from './common';
import { expect } from 'chai';
import { AppBuildOptions, AppCreateOptions, ModuleBuildOptions, ModuleCreateOptions } from '../types';

/**
 * Wrapper around the project creation flow to make it slightly easier to test
 */
export class Project extends CommonUICreator {

	// App specific
	public async buildApp(options: AppBuildOptions): Promise<void> {

		await this.workbench.executeCommand('Titanium: Build');

		await this.setPlatform(options.platform);
		await this.setTarget(options.target);

		if (options.platform === 'ios' && options.target === 'simulator') {
			await this.setSimulatorVersion(options.simulatorVersion);
		}

		await this.setDevice(options.target, options.deviceId);
	}

	public async createApp(options: AppCreateOptions): Promise<void> {
		// We need to configure the setting for the creation directory before running any commands
		await this.configureSetting('General', 'Default Creation Directory', options.folder);

		await this.workbench.executeCommand('Titanium: Create application');

		await this.setName(options.name);
		await this.setId(options.id);
		await this.setPlatforms(options.platforms);
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

		await this.driver.wait(async () => {
			await this.driver.sleep(2500);

			try {
				// has info loaded yet?
				await InputBox.create();
				return true;
			} catch (error) {
			}
		}, 30000);

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

	public async buildModule(options: ModuleBuildOptions): Promise<void> {
		await this.workbench.executeCommand('Titanium: Build');

		await this.setPlatform(options.platform);
	}

	public async packageModule(options: ModuleBuildOptions): Promise<void> {
		await this.workbench.executeCommand('Titanium: Package');

		await this.setPlatform(options.platform);

		await this.waitForBuildCompletion();
	}

	public async cleanModule(options: ModuleBuildOptions): Promise<void> {
		await this.workbench.executeCommand('Titanium: Clean');

		await this.setPlatform(options.platform);

		await this.driver.wait(async () => {
			await this.driver.sleep(500);
			return notificationExists('cleaning project');
		}, 7500);
	}

	// Creation specific helpers

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

	// Building specific helpers

	public async setPlatform(platform: string): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();

		expect(placeHolderText).to.equal('Select a platform', 'Did not show platform selection');

		await input.setText(platform);
		await input.confirm();
	}

	public async setTarget(target: string): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();

		expect(placeHolderText).to.equal('Select a target', 'Did not show target selection');

		await input.setText(target);
		await input.confirm();
	}

	public async setSimulatorVersion(version?: string): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();

		expect(placeHolderText).to.equal('Select simulator version', 'Did not show simulator version selection');

		if (version) {
			await input.setText(version);
		}
		await input.confirm();
	}

	public async setDevice(target: string, deviceId?: string): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();

		expect(placeHolderText).to.equal(`Select ${target}`, 'Did not show device selection');

		if (deviceId) {
			await input.setText(deviceId);
		}
		await input.confirm();
	}

	public async waitForBuildCompletion (): Promise<void> {
		const terminal =  await new BottomBarPanel().openTerminalView();

		await this.driver.wait(async () => {
			await this.driver.sleep(2500);
			const text = await terminal.getText();

			if (text.includes('Terminal will be reused by tasks, press any key to close it.')) {
				return true;
			}
		}, 60000);
	}
}
