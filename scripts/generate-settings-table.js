const fs = require('fs');
const path = require('path');
const { contributes: { configuration } } = require('../package.json');

let tableString = '| Setting name | Description | Default Value |';
tableString = `${tableString}\n| ------------- | ------------- | ----- |`
for (const [ name, settingInfo ] of Object.entries(configuration.properties)) {
	const defaultValue = settingInfo.default === undefined || settingInfo.default.length === 0 ? 'No Default' : settingInfo.default;
	tableString = `${tableString}\n| \`${name}\` | ${settingInfo.description} | \`${defaultValue}\` |`
}

const fileContents = `# Configuration Settings

There are a variety of settings that you can use to customize this extension to your needs. You can find them listed below.

You can learn more about User and Workspace settings in the [VS Code documentation](https://code.visualstudio.com/docs/getstarted/settings).

${tableString}
`;

fs.writeFileSync(path.join(__dirname, '..', 'configuration.md'), fileContents);
