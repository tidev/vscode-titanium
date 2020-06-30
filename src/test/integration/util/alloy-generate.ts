import { InputBox } from 'vscode-extension-tester';
import { notificationExists, CommonUICreator } from './common';
import { capitalizeFirstLetter } from '../util/common';

export class AlloyGenerate extends CommonUICreator {

	async generateComponent(type: string, name: string, force = false): Promise<void> {

		await this.workbench.executeCommand(`Titanium: Generate Alloy ${type}`);
		await this.setName(name);
		if (force) {
			// todo
		}

		await this.driver.wait(() => notificationExists(`${capitalizeFirstLetter(type)} ${name} created successfully`), 7500);
	}

	async setName (name: string): Promise<void> {
		const input = await InputBox.create();
		await input.setText(name);
		await input.confirm();
	}
}
