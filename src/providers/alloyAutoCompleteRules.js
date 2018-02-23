const vscode = require('vscode');
const utils = require('../utils');
const _ = require('underscore');
const find = require('find');
const path = require('path');
const fs = require('fs');
const parseString = require('xml2js').parseString;

module.exports = {
	cfg: {
		regExp: /Alloy\.CFG\.([-a-zA-Z0-9-_/]*)$/,
		getCompletions(linePrefix, position, prefix) {
			let completions
			if (this.regExp.test(linePrefix)) {
				const cfgPath = path.join(utils.getAlloyRootPath(), 'config.json');
				completions = [];
				if (utils.fileExists(cfgPath)) {
					try {
						// let cfgObj = JSON.parse(vscode.workspace.openTextDocument(cfgPath).getText());
						let cfgObj = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
						cfgObj = _.reduce(cfgObj, function (memo, value, key) {
							if ((key === 'global') || key.startsWith('env:') || key.startsWith('os:')) {
								return _.extend(memo, value);
							} else {
								return memo;
							}
						}, {});

						const allKeys = utils.getAllKeys(cfgObj);
						for (const key of allKeys) {
							completions.push({
								label: key,
								kind: vscode.CompletionItemKind.Value
							});
						}
					} catch (error) {
						console.log(error);
					}
				}
			}

			return completions;
		}
	},

	i18n: {
		regExp: /(L\(|titleid\s*[:=]\s*)["'](\w*)$/,
		getCompletions(linePrefix) {
			let completions;
			if (this.regExp.test(linePrefix)) {
				const defaultLang = vscode.workspace.getConfiguration('appcelerator-titanium.project').get('defaultI18nLanguage');
				const i18nPath = utils.getI18nPath();
				if (utils.directoryExists(i18nPath)) {
					const i18nStringPath = path.join(utils.getI18nPath(), defaultLang, 'strings.xml');
					completions = [];
					if (utils.fileExists(i18nStringPath)) {
						parseString(fs.readFileSync(i18nStringPath, 'utf8'), (error, result) => {
							if (result && result.resources && result.resources.string) {
								for (let value of result.resources.string) {
									completions.push({
										label: value.$.name,
										kind: vscode.CompletionItemKind.Reference,
										detail: value._
									});
								}
							}
						});
					}
				}
			}
			return completions;
		}
	},
	image: {
		regExp: /image\s*[:=]\s*["']([\w\s\\/\-_():.]*)$/,
		getCompletions(linePrefix) {
			let completions;
			if (this.regExp.test(linePrefix)) {
				const alloyRootPath = utils.getAlloyRootPath();
				const assetPath = path.join(alloyRootPath, 'assets');
				completions = [];
				// limit search to these sub-directories
				let paths = [ 'images', 'iphone', 'android', 'windows' ];
				paths = paths.map(aPath => path.join(assetPath, aPath));

				for (const imgPath of paths) {
					if (!utils.directoryExists(imgPath)) {
						continue;
					}
					const files = find.fileSync(imgPath);
					const images = [];
					for (const file of files) {
						let prefix, suffix, scale;
						// test whether image is includes scaling factor (for iOS)
						let matches = file.match(/(^[\w\s\\/\-_():]+)(@[\w~]+)(.\w+$)/);
						if (matches && matches.length === 4) {
							prefix = matches[1];
							scale = matches[2];
							suffix = matches[3];
						} else if (!file.endsWith('.DS_Store')) {
							matches = file.match(/(^[\w\s/\\\-_():]+)(.\w+$)/);
							if (matches && matches.length === 3) {
								prefix = matches[1];
								scale = '@1x';
								suffix = matches[2];
							}
						}

						if (prefix && suffix && scale) {
							let image = images.find(image => (image.prefix === prefix && image.suffix === suffix));
							if (image) {
								image.scales.push(scale);
							} else {
								images.push({
									prefix,
									suffix,
									file,
									scales: [ scale ]
								});
							}
						}
					}

					for (const image of images) {
						let scales;
						if (!(image.scales.length === 1 && image.scales[0] === '@1x')) {
							scales = image.scales.join(', ');
						}
						completions.push({
							// type: 'file',
							// text: utils.toUnixPath(`${image.prefix}${image.suffix}`.replace(assetPath, '')).replace(/^\/(iphone|android|windows)/, ''),
							// rightLabel: scales,
							// replacementPrefix: utils.getCustomPrefix(request),
							// iconHTML: `<div class="appc-suggestion-icon"><div class="image" style="background-image: url(${utils.toUnixPath(image.file)});"></div></div>`
							label: utils.toUnixPath(`${image.prefix}${image.suffix}`.replace(assetPath, '')).replace(/^\/(iphone|android|windows)/, ''),
							kind: vscode.CompletionItemKind.File,
							detail: scales
						});
					}
				}
			}
			return completions;
		}
	}
};
