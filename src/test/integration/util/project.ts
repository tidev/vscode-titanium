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

		await this.waitForBuildCompletion(/Start (application|simulator) log/);

		await this.workbench.executeCommand('Titanium: Stop');
	}

	public async cleanApp(): Promise<void> {
		await this.workbench.executeCommand('Titanium: Clean');

		await this.driver.wait(async () => {
			await this.driver.sleep(500);
			return notificationExists('cleaning project');
		}, 7500);
	}

	public async createApp(options: AppCreateOptions): Promise<void> {
		// We need to configure the setting for the creation directory before running any commands
		await this.configureSetting('General', 'Default Creation Directory', options.folder);

		await this.workbench.executeCommand('Titanium: Create application');

		await this.setName(options.name);
		await this.setId(options.id);
		await this.setPlatforms(options.platforms);
		await this.setFolder();
		await this.setClassicOrAlloy(options.classic);

		try {
			await this.driver.wait(async () => {
				// We need to sleep here as there are times when the 'Creating application' notification
				// is still shown but is dismissed by the time we get the text in notificationExists and
				// causes errors to be thrown that can't be handled
				await this.driver.sleep(100);
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
				// ignore
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
				// We need to sleep here as there are times when the 'Creating module' notification
				// is still shown but is dismissed by the time we get the text in notificationExists and
				// causes errors to be thrown that can't be handled
				await this.driver.sleep(100);
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

		await this.waitForBuildCompletion(/Terminal will be reused by tasks, press any key to close it./);
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

	public async setClassicOrAlloy(classicApp?: boolean): Promise<void> {
		const input = await InputBox.create();

		const placeHolderText = await input.getPlaceHolder();
		expect(placeHolderText).to.equal('Create an Alloy project?', 'Did not show alloy or classic selection');

		if (classicApp) {
			await input.setText('No');
		} else {
			await input.setText('Yes');
		}

		await input.confirm();
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

		const choices = await input.getCheckboxes();
		for (const choice of choices) {
			const text = await choice.getText();
			if (!platforms.includes(text.toLowerCase())) {
				await choice.select();
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

	public async waitForBuildCompletion (finishRegex: RegExp): Promise<void> {
		const terminal =  await new BottomBarPanel().openTerminalView();

		await this.driver.wait(async () => {
			await this.driver.sleep(2500);
			const text = await terminal.getText();
			// First check if the finishRegex has been matched, then check for errors in the log.
			// We do this because we dont want errors from the runtime to cause an error
			if (text.match(finishRegex)) {
				return true;
			}

			expect(text).to.not.include('ERROR', 'There were errors in the build logs');

		}, 90000);
	}

	public async openInWorkspace (): Promise<void> {
		const notification = await this.driver.wait(async () => {
			return await notificationExists('project created');
		});

		if (!notification) {
			throw new Error('Creation notification did not show');
		}

		let opened = false;
		const actions = await notification?.getActions() || [];
		for (const button of actions) {
			const text = await button.getTitle();
			if (text.includes('workspace')) {
				await button.click();
				opened = true;
			}
		}

		if (!opened) {
			throw new Error('Failed to open project');
		}
	}
}
