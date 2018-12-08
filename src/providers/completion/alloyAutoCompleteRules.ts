import walkSync from 'klaw-sync';
import * as path from 'path';
import * as _ from 'underscore';
import * as utils from '../../utils';

import { CompletionItemKind, workspace } from 'vscode';
import { parseString } from 'xml2js';

export const cfgAutoComplete = {
	regExp: /Alloy\.CFG\.([-a-zA-Z0-9-_/]*)$/,
	async getCompletions () {
		const cfgPath = path.join(utils.getAlloyRootPath(), 'config.json');
		const completions = [];
		if (utils.fileExists(cfgPath)) {
			const document = await workspace.openTextDocument(cfgPath);
			let cfgObj = JSON.parse(document.getText());
			cfgObj = _.reduce(cfgObj, (memo, value, key) => {
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
					kind: CompletionItemKind.Value
				});
			}
			return completions;
		}
	}
};

export const i18nAutoComplete = {
	regExp: /(L\(|titleid\s*[:=]\s*)["'](\w*)$/,
	async getCompletions () {
		const defaultLang: string = workspace.getConfiguration('titanium.project').get('defaultI18nLanguage');
		const i18nPath = utils.getI18nPath();
		if (utils.directoryExists(i18nPath)) {
			const i18nStringPath = path.join(i18nPath, defaultLang, 'strings.xml');
			const completions = [];
			if (utils.fileExists(i18nStringPath)) {
				const document = await workspace.openTextDocument(i18nStringPath);
				parseString(document.getText(), (error, result) => {
					if (result && result.resources && result.resources.string) {
						for (const value of result.resources.string) {
							completions.push({
								label: value.$.name,
								kind: CompletionItemKind.Reference,
								detail: value._
							});
						}
						return completions;
					}
				});
			}
		}
	}
};
export const imageAutoComplete = {
	regExp: /image\s*[:=]\s*["']([\w\s\\/\-_():.]*)$/,
	getCompletions () {
		const alloyRootPath = utils.getAlloyRootPath();
		const assetPath = path.join(alloyRootPath, 'assets');
		const completions = [];
		// limit search to these sub-directories
		let paths = [ 'images', 'iphone', 'android', 'windows' ];
		paths = paths.map(aPath => path.join(assetPath, aPath));

		for (const imgPath of paths) {
			if (!utils.directoryExists(imgPath)) {
				continue;
			}
			const files = walkSync(imgPath, {
				nodir: true,
				filter: item => path.basename(item.path) !== '.DS_Store'
			});
			const images = [];
			for (const file of files) {
				let prefix;
				let scale;
				let suffix;
				// test whether image is includes scaling factor (for iOS)
				let matches = file.path.match(/(^[\w\s\\/\-_():]+)(@[\w~]+)(.\w+$)/);
				if (matches && matches.length === 4) {
					prefix = matches[1];
					scale = matches[2];
					suffix = matches[3];
				} else {
					matches = file.path.match(/(^[\w\s/\\\-_():]+)(.\w+$)/);
					if (matches && matches.length === 3) {
						prefix = matches[1];
						scale = '@1x';
						suffix = matches[2];
					}
				}

				if (prefix && suffix && scale) {
					const image = images.find(img => (img.prefix === prefix && img.suffix === suffix));
					if (image) {
						image.scales.push(scale);
					} else {
						images.push({
							prefix,
							suffix,
							file: file.path,
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
				// TODO: Is it possible to preview the image like the atom plugin?
				completions.push({
					label: utils.toUnixPath(`${image.prefix}${image.suffix}`.replace(assetPath, '')).replace(/^\/(iphone|android|windows)/, ''),
					kind: CompletionItemKind.File,
					detail: scales
				});
			}
		}
		return completions;
	}
};
