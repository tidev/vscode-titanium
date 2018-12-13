import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'underscore';
import appc from '../../appc';
import project from '../../project';

import { homedir } from 'os';
/**
 * Load completions list
 *
 * @returns {Object}
 */
export async function loadCompletions () {
	try {
		const sdk = project.sdk()[0];
		const alloyVersion = await appc.getAlloyVersion();
		const sdkCompletions = await fs.readJSON(this.getSDKCompletionsFileName(sdk));
		const alloyCompletions = await fs.readJSON(this.getAlloyCompletionsFileName(alloyVersion));
		_.extend(sdkCompletions.properties, {
			id: {
				description: 'TSS id'
			},
			class: {
				description: 'TSS class'
			},
			platform: {
				type: 'String',
				description: 'Platform condition',
				values: [
					'android',
					'ios',
					'mobileweb',
					'windows'
				]
			}
		});
		return {
			alloy: alloyCompletions,
			titanium: sdkCompletions
		};
	} catch (error) {
		throw error;
	}
}

export function getSDKCompletionsFileName (version) {
	return path.join(homedir(), '.titanium', 'completions', 'titanium', version, 'completions.json');
}

export function getAlloyCompletionsFileName (version) {
	return path.join(homedir(), '.titanium', 'completions', 'alloy', version, 'completions.json');
}

/**
 * Matches
 *
 * @param {String} text text to test
 * @param {String} test text to match aginst
 *
 * @returns {Boolean}
 */
export function matches (text, test) {
	return new RegExp(test, 'i').test(text);
}

/**
 * Generate completions for an Alloy version.
 *
 * @param {Object} opts - Options
 * @param {Boolean} opts.force - Force generation of completion file.
 * @param {Object} [opts.progress] - Progress output.
 */
export async function generateAlloyCompletions ({ force = false, progress = null } = {}) {
	const appcPath = path.join(homedir(), '.appcelerator', 'install');
	const version = await fs.readFile(path.join(appcPath, '.version'), 'utf8');
	const alloyPath = path.join(appcPath, version, 'package', 'node_modules', 'alloy');
	const alloyVersion = await appc.getAlloyVersion();

	const alloyCompletionsFilename = this.getAlloyCompletionsFileName(alloyVersion);

	if (!force && fs.existsSync(alloyCompletionsFilename)) {
		return;
	}

	// TODO: Generate completions from this?
	// const alloyApi = await fs.readJSON(path.join(alloyPath, 'docs', 'api.jsca'));

	// generate tag list
	const alloyTags = await fs.readdir(path.join(alloyPath, 'Alloy', 'commands', 'compile', 'parsers'));
	const tagDic = {};
	for (const tag of alloyTags) {
		if (!tag.endsWith('.js')) {
			continue;
		}
		const ar = tag.split('.');
		const tagName = ar[ar.length - 2];
		if (tagName.indexOf('_') !== 0 && tagName[0] === tagName[0].toUpperCase()) {
			tagDic[tagName] = {
				apiName: tag.replace('.js', '')
			};
		} else if (tagName === '_ProxyProperty' && tag.indexOf('Ti.UI') === 0) {
			tagDic[ar[ar.length - 3]] = { // Ti.UI.Window._ProxyProperty
				apiName: tag.replace('.js', '').replace('._ProxyProperty', '')
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

	// // missing types
	// Object.assign(types, {
	// 	'Alloy.Abstract.ItemTemplate': {
	// 		description: 'Template that represents the basic appearance of a list item.',
	// 		functions: [
	// 		],
	// 		properties: [
	// 			'name',
	// 			'height'
	// 		],
	// 		events: []
	// 	},
	// 	'Alloy.Widget': {
	// 		description: 'Widgets are self-contained components that can be easily dropped into an Alloy project.',
	// 		functions: [],
	// 		properties: [
	// 			'src'
	// 		],
	// 		events: []
	// 	},
	// 	'Alloy.Require': {
	// 		description: 'Require alloy controller',
	// 		functions: [],
	// 		properties: [
	// 			'src'
	// 		],
	// 		events: []
	// 	}
	// });

	const sortedTagDic = {};
	Object.keys(tagDic)
		.sort()
		.forEach(k => sortedTagDic[k] = tagDic[k]);
	try {
		await fs.ensureDir(path.dirname(alloyCompletionsFilename));
		await fs.writeFile(alloyCompletionsFilename, JSON.stringify({
			version: 1,
			alloyVersion,
			tags: sortedTagDic
		}, null, 4));
		return alloyVersion;
	} catch (error) {
		throw error;
	}
}

/**
 *
 * Generate completions file for a Titanium SDK.
 *
 * @param {Object} opts - Options.
 * @param {Boolean} [opts.force=false] - Force generation of the completion file.
 * @param {Progress} [progress] activity progress object.
 * @param {String} sdkVersion - SDK Version to generate completions for.
 */
export async function generateSDKCompletions ({ force = false, progress, sdkVersion }) {
	// Make sdkVersion optional and load for selected SDK?
	const sdkCompletionsFilename = this.getSDKCompletionsFileName(sdkVersion);

	if (!force && fs.existsSync(sdkCompletionsFilename)) {
		return;
	}

	if (progress) {
		progress.report({ message: 'Generating autocomplete suggestions ...' });
	}

	const sdk = appc.sdkInfo(sdkVersion);
	const titaniumAPIPath = path.join(sdk.path, 'api.jsca');
	const api = await fs.readJSON(titaniumAPIPath);
	// property list
	const types: any = {};
	const props: any = {};
	for (const type of api.types) {
		if (type.deprecated) {
			continue;
		}

		const propertyNamesOfType = [];
		for (const prop of type.properties) {
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
		}

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
	}

	// Alias
	for (const [ key, prop ] of Object.entries(props) as any[]) {
		if (prop.type === 'Boolean') {
			prop.values = [ 'true', 'false' ];
		} else if (prop.values) {
			// alias Titanium -> Ti
			prop.values = prop.values.map(val => {
				const splitedName = val.split('.');
				const typeName = splitedName.slice(0, -1).join('.');
				const tiUIProps = api.types.find(type => type.name === typeName).properties;
				const curPropInfo = tiUIProps.find(property => property.name === splitedName[splitedName.length - 1]);

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

	// missing values
	props.layout.values = [ '\'vertical\'', '\'horizontal\'', '\'composite\'' ];

	const sortedProps = {};
	Object.keys(props)
		.sort()
		.forEach(k => sortedProps[k] = props[k]);

	try {
		await fs.ensureDir(path.dirname(sdkCompletionsFilename));
		await fs.writeJSON(
			sdkCompletionsFilename,
			{
				version: 1,
				sdkVersion: `${sdk.fullversion}`,
				properties: sortedProps,
				types
			},
			{
				spaces: 4
			});
		return sdkVersion;
	} catch (error) {
		throw error;
	}
}
