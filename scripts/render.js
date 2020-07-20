const ejs = require('ejs');
const fs = require('fs-extra');
const packageJson = require('../package.json');
const path = require('path');

const renderObject = {
	commands: generateCommands(),
	settings: generateSettings(),
	snippets: generateSnippets()
};

const template = fs.readFileSync(path.join(__dirname, 'templates', 'README.md.ejs'), 'utf8');

const contents = ejs.render(template, renderObject);

fs.writeFileSync(path.join(__dirname, '..', 'test-output.md'), contents);

function generateCommands() {
	const { contributes: { commands, keybindings, menus } } = packageJson;
	const keyBindingsMap = keybindings.reduce((o, keybinding) => ({ ...o, [keybinding.command]: { mac: keybinding.mac, other: keybinding.key } }), {});
	const commandPaletteMap = menus.commandPalette.reduce((o, command) => ({ ...o, [command.command]: { when: command.when } }), {});
	const commandInformation = [];
	for (const { category, command, description, title } of commands) {
		const activeInCommandPalette = commandPaletteMap[command];
		if (!activeInCommandPalette) {
			console.error(`Failed to look up ${command} in menus.commandPalette`);
			continue;
		}
		const keybinding = buildKeybindingString(keyBindingsMap[command]);
		if (activeInCommandPalette.when === 'false') {
			continue;
		}
		commandInformation.push({
			name: `\`${category}: ${title}\``,
			description: description || title,
			keybinding
		});

	}
	return commandInformation;
}

function generateSettings() {
	const { contributes: { configuration } } = packageJson;
	const settingsInformation = [];
	for (const [ name, settingInfo ] of Object.entries(configuration.properties)) {
		const defaultValue = settingInfo.default === null || settingInfo.default.length === 0 ? 'No Default' : settingInfo.default;
		settingsInformation.push({
			name: `\`${name}\``,
			description: settingInfo.description,
			defaultValue: `\`${defaultValue}\``
		});
	}
	return settingsInformation;
}

function buildKeybindingString (keybinding) {
	let string = '';
	if (!keybinding) {
		return '-';
	}
	const splitMac = keybinding.mac.split('+');
	const splitOther = keybinding.other.split('+');
	string = `${string} Mac: `;
	for (let i = 0; i < splitMac.length; i++) {
		const part = splitMac[i];
		if (i < splitMac.length - 1) {
			string = `${string}<kbd>${part}</kbd>+`;
		} else {
			string = `${string}<kbd>${part}</kbd>`;
		}
	}
	string = `${string} <br> Windows/Linux: `;
	for (let i = 0; i < splitOther.length; i++) {
		const part = splitOther[i];
		if (i < splitOther.length - 1) {
			string = `${string}<kbd>${part}</kbd>+`;
		} else {
			string = `${string}<kbd>${part}</kbd>`;
		}
	}
	return string;
}

function generateSnippets() {
	const snippetInformation = {
		alloy: [],
		titanium: []
	};

	const { contributes: { snippets } } = packageJson;
	for (const { description, path: filePath } of snippets) {
		const snippetDefinitions = fs.readJSONSync(filePath);
		const snippetInfo = [];
		for (const { description, prefix } of Object.values(snippetDefinitions)) {
			snippetInfo.push({
				prefix: `\`${prefix}\``,
				description
			});
		}
		if (description.includes('Titanium')) {
			snippetInformation.titanium = snippetInfo;
		} else if (description.includes('Alloy')) {
			snippetInformation.alloy = snippetInfo;
		}
	}

	return snippetInformation;
}
