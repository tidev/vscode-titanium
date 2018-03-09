const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const Appc = require('../appc');
const { homedir } = require('os');

const CompletionsGenerator = {

	/**
	 *
	 * generate completions
	 *
	 * @param {Progress} progress activity progress object
	 * @param {Function} callback callback function
	 */
	generateCompletions(progress, callback) {
		const completionsFilename = path.join(__dirname, 'completions.js');
		if (!vscode.workspace.getConfiguration('appcelerator-titanium.general').get('generateAutoCompleteSuggestions')
			&& fs.existsSync(completionsFilename)) {
			callback && callback(true);
			return;
		}
		vscode.workspace.getConfiguration('appcelerator-titanium.general').update('generateAutoCompleteSuggestions', false, true);
		progress && progress.report({ message: 'Generating autocomplete suggestions...' });

		const appcPath = path.join(homedir(), '.appcelerator/install');
		const version = fs.readFileSync(path.join(appcPath, '.version'), 'utf8');
		const alloyPath = path.join(appcPath, version, 'package/node_modules/alloy');
		// const alloyApi = JSON.parse(fs.readFileSync(path.join(alloyPath, 'docs/api.jsca'), 'utf8'));
		const sdk = Appc.selectedSdk();
		const titaniumAPIPath = path.join(sdk.path, 'api.jsca');
		const api = JSON.parse(fs.readFileSync(titaniumAPIPath, 'utf8'));

		// generate tag list
		const fns = fs.readdirSync(path.join(alloyPath, '/Alloy/commands/compile/parsers'));
		let tagDic = {};
		for (const fn of fns) {
			if (!fn.endsWith('.js')) {
				continue;
			}
			const ar = fn.split('.');
			const tagName = ar[ar.length - 2];
			if (tagName.indexOf('_') !== 0 && tagName[0] === tagName[0].toUpperCase()) {
				tagDic[tagName] = {
					apiName: fn.replace('.js', '')
				};
			} else if (tagName === '_ProxyProperty' && fn.indexOf('Ti.UI') === 0) {
				tagDic[ar[ar.length - 3]] = { // Ti.UI.Window._ProxyProperty
					apiName: fn.replace('.js', '').replace('._ProxyProperty', '')
				};
			}
		}

		// add missing tags
		Object.assign(tagDic, {
			View: {
				apiName: 'Ti.UI.View'
			},
			Templates: {},
			HeaderView: {},
			FooterView: {},
			ScrollView: {
				apiName: 'Ti.UI.ScrollView'
			},
			Slider: {
				apiName: 'Ti.UI.Slider'
			},
			TableViewRow: {
				apiName: 'Ti.UI.TableViewRow'
			},
			Alloy: {},
			ActivityIndicator: {
				apiName: 'Ti.UI.ActivityIndicator'
			},
			WebView: {
				apiName: 'Ti.UI.WebView'
			}
		});

		// property list
		const types = {};
		const props = {};
		api.types.forEach((type) => {
			if (type.deprecated) {
				return;
			}

			let propertyNamesOfType = [];
			type.properties.forEach((prop) => {
				if (prop.permission !== 'read-only' && prop.name.indexOf('Modules.') !== 0) {

					propertyNamesOfType.push(prop.name);

					// property name
					if (props[prop.name]) { // if duplicated property name - merge available values
						Object.assign(props[prop.name], {
							description: props[prop.name].description === prop.description.replace(/<p>|<\/p>/g, '') ? props[prop.name].description : ''
						});
						if (prop.constants.length) {
							const values = props[prop.name].values ? props[prop.name].values.concat(prop.constants) : prop.constants;
							props[prop.name].values = [ ...new Set(values) ];
						}

					} else {
						props[prop.name] = {
							description: prop.description.replace(/<p>|<\/p>/g, ''),
							type: prop.type
						};
						if (prop.constants.length) {
							props[prop.name].values = prop.constants;
						}
					}
				}
			});

			types[type.name.replace(/Titanium\./g, 'Ti.')] = {
				description: type.description.replace(/<p>|<\/p>/g, ''),
				functions: type.functions.map(f => {
					return (f.deprecated) ? f.name + '|deprecated' : f.name;
				}),
				properties: propertyNamesOfType,
				events: type.events.map(e => {
					return (e.deprecated) ? e.name + '|deprecated' : e.name;
				})
			};
		});

		// Alias
		for (const key in props) {
			const prop = props[key];
			if (prop.type === 'Boolean') {
				prop.values = [ 'true', 'false' ];
			} else if (prop.values) {
				// alias Titanium -> Ti
				prop.values = prop.values.map(val => {
					const splitedName = val.split('.');
					const typeName = splitedName.slice(0, -1).join('.');
					const tiUIProps = api.types.find(type => type.name === typeName).properties;
					const curPropInfo = tiUIProps.find(prop => prop.name === splitedName[splitedName.length - 1]);

					let shortName = val.replace(/Titanium\./g, 'Ti.');
					if (curPropInfo.deprecated) {
						shortName += '|deprecated';
					}
					return shortName;
				});
			}

			if (/[Cc]olor$/.test(key)) {
				prop.values = [
					'\'transparent\'', '\'aqua\'', '\'black\'', '\'blue\'', '\'brown\'', '\'cyan\'', '\'darkgray\'', '\'fuchsia\'', '\'gray\'', '\'green\'',
					'\'lightgray\'', '\'lime\'', '\'magenta\'', '\'maroon\'', '\'navy\'', '\'olive\'', '\'orange\'', '\'pink\'', '\'purple\'', '\'red\'',
					'\'silver\'', '\'teal\'', '\'white\'', '\'yellow\''
				];
			}
		}

		// missing types
		Object.assign(types, {
			'Alloy.Abstract.ItemTemplate': {
				description: 'Template that represents the basic appearance of a list item.',
				functions: [
				],
				properties: [
					'name',
					'height'
				],
				events: []
			},
			'Alloy.Widget': {
				description: 'Widgets are self-contained components that can be easily dropped into an Alloy project.',
				functions: [],
				properties: [
					'src'
				],
				events: []
			},
			'Alloy.Require': {
				description: 'Require alloy controller',
				functions: [],
				properties: [
					'src'
				],
				events: []
			}
		});

		// missing values
		props.layout.values = [ '\'vertical\'', '\'horizontal\'', '\'composite\'' ];

		let sortedTagDic = {};
		Object.keys(tagDic)
			.sort()
			.forEach(k => sortedTagDic[k] = tagDic[k]);

		const sortedProps = {};
		Object.keys(props)
			.sort()
			.forEach(k => sortedProps[k] = props[k]);

		fs.writeFile(completionsFilename,
			'module.exports = ' + JSON.stringify({
				version: 1,
				sdkVersion: `${sdk.fullversion}`,
				properties: sortedProps,
				tags: sortedTagDic,
				types: types
			}, null, 4),
			function (err) {
				if (err) {
					// console.error(err);
				} else {
					vscode.window.showInformationMessage(`Appcelerator Titanium: Autocomplete suggestions generated for Titanium SDK ${sdk.fullversion}`);
					callback && callback(true);
				}
			});
	}
};

module.exports = CompletionsGenerator;
