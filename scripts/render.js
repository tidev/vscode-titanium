const ejs = require('ejs');
const fs = require('fs-extra');
const packageJson = require('../package.json');
const path = require('path');

const renderObject = {
	commands: generateCommands(),
	debugProperties: generateDebugProperties(),
	settings: generateSettings(),
	snippets: generateSnippets(),
	taskProperties: generateTaskProperties()
};

const readmeTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'README.md.ejs'), 'utf8');

const contents = ejs.render(readmeTemplate, renderObject);
fs.writeFileSync(path.join(__dirname, '..', 'test-output.md'), contents);

const debuggingTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'debugging.md.ejs'), 'utf8');
const debugContents = ejs.render(debuggingTemplate, renderObject);
fs.writeFileSync(path.join(__dirname, '..', 'doc', 'debugging.md'), debugContents);

const taskTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'tasks.md.ejs'), 'utf8');
const taskContents = ejs.render(taskTemplate, renderObject);
fs.writeFileSync(path.join(__dirname, '..', 'doc', 'tasks.md'), taskContents);

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

function generateDebugProperties () {
	const debuggingInformation = {
		launch: []
	};

	const { contributes: { debuggers } } = packageJson;
	const { required, properties } = debuggers[0].configurationAttributes.launch;
	for (const [ name, information ] of Object.entries(properties)) {
		debuggingInformation.launch.push({
			name,
			description: information.description,
			defaultValue: information.defaultValue,
			required: required.includes(name)
		});
	}
	return debuggingInformation;
}

function generateTaskProperties () {
	const taskInformation = { };

	function buildPropertiesObject (properties, taskType) {
		const propertiesObject = {
			android: [],
			common: [],
			ios: []
		};

		const androidProperties = Object.entries(properties).find(([ name ]) => name === 'android');
		const iOSProperties = Object.entries(properties).find(([ name ]) => name === 'ios');
		const commonProperties = Object.entries(properties).filter(([ name ]) => name !== 'android' && name !== 'ios');

		propertiesObject.android = recurseProperties(Object.entries(androidProperties[1].properties), 'Android', taskType, 'titaniumBuild.android');
		propertiesObject.common = recurseProperties(commonProperties);
		propertiesObject.ios = recurseProperties(Object.entries(iOSProperties[1].properties), 'iOS', taskType, 'titaniumBuild.ios');

		propertiesObject.common.push({
			name: 'titaniumBuild.android',
			description: 'Android configuration options',
			validValues: `See [Android ${taskType} Task Configuration](#android-${taskType}-task-configuration)`
		});

		propertiesObject.common.push({
			name: 'titaniumBuild.ios',
			description: 'iOS configuration options',
			validValues: `See [iOS ${taskType} Task Configuration](#ios-${taskType}-task-configuration)`
		});
		return propertiesObject;
	}

	const { contributes: { taskDefinitions } } = packageJson;
	const buildTask = taskDefinitions.find(definition => definition.type === 'titanium-build');
	taskInformation.build = buildPropertiesObject(buildTask.properties.titaniumBuild.properties, 'Build');

	const packageTask = taskDefinitions.find(definition => definition.type === 'titanium-package');
	taskInformation.package = buildPropertiesObject(packageTask.properties.titaniumBuild.properties, 'Package');

	return taskInformation;
}

function recurseProperties(properties, platform, taskType, propertyPrefix = 'titaniumBuild') {
	const propertyData = [];
	for (const [ name, information ] of properties) {
		if (information.properties) {
			propertyData.push(...recurseProperties(Object.entries(information.properties), platform, taskType, `${propertyPrefix}.${name}`));
			continue;
		}
		propertyData.push({
			name: `\`${propertyPrefix}.${name}\``,
			description: information.description,
			defaultValue: information.defaultValue,
			validValues: information.enum ? information.enum.map(value => `\`${value}\``).join(', ') : 'N/A'
		});
	}
	if (!propertyData.length) {
		return `There are no ${platform} specific configuration properties for the ${taskType} task.`;
	}
	return propertyData;
}
