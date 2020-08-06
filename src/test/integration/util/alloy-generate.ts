import { InputBox } from 'vscode-extension-tester';
import { notificationExists, CommonUICreator } from './common';
import { capitalizeFirstLetter } from '../util/common';
import { expect } from 'chai';

export class AlloyGenerate extends CommonUICreator {

	async generateComponent(type: string, name: string, force = false): Promise<void> {

		await this.workbench.executeCommand(`Titanium: Generate Alloy ${type}`);

		await this.setName(name, type);
		if (force) {
			// todo
		}

		await this.driver.wait(() => notificationExists(`${capitalizeFirstLetter(type)} ${name} created successfully`), 7500);
	}

	async setName (name: string, type: string): Promise<void> {
		const input = await InputBox.create();

		const message = await input.getMessage();
		expect(message).to.include(`Enter the name for your ${type}`, 'Did not prompt for name');

		await input.setText(name);
		await input.confirm();
	}
}
