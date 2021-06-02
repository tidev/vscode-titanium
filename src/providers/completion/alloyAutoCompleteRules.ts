import walkSync from 'klaw-sync';
import * as path from 'path';
import * as utils from '../../utils';

import { CompletionItem, CompletionItemKind, workspace, Range } from 'vscode';
import { ExtensionContainer } from '../../container';
import { parseXmlString } from '../../common/utils';
import { Project } from '../..//project';
import { pathExists } from 'fs-extra';

interface AlloyAutoCompleteRule {
	regExp: RegExp;
	getCompletions: (project: Project, range?: Range) => Promise<CompletionItem[]>|CompletionItem[];
	requireRange?: boolean;
	rangeRegex?: RegExp;
}

export const cfgAutoComplete: AlloyAutoCompleteRule = {
	regExp: /Alloy\.CFG\.([-a-zA-Z0-9-_/]*)[,]?$/,
	async getCompletions (projectDir) {
		const cfgPath = path.join(projectDir.filePath, 'app', 'config.json');
		const completions: CompletionItem[] = [];
		if (!await pathExists(cfgPath)) {
			return completions;
		}
		const document = await workspace.openTextDocument(cfgPath);
		const cfgObj = JSON.parse(document.getText());
		const deconstructedConfig = {};

		for (const [ key, value ] of Object.entries(cfgObj)) {
			if (key === 'global' || key.startsWith('os:') || key.startsWith('env:')) {
				// Ignore and traverse
				Object.assign(deconstructedConfig, value);
			}
		}

		const allKeys = utils.getAllKeys(deconstructedConfig);
		for (const key of allKeys) {
			completions.push({
				label: key,
				kind: CompletionItemKind.Value
			});
		}
		return completions;
	}
};

export const i18nAutoComplete: AlloyAutoCompleteRule = {
	regExp: /(L\(|(?:hinttext|title|text)id\s*[:=]\s*)["'](\w*["']?)$/,
	async getCompletions (projectDir) {
		const defaultLang = ExtensionContainer.config?.project.defaultI18nLanguage || 'en';
		const i18nPath = await projectDir.getI18NPath();
		const completions: CompletionItem[] = [];
		if (!i18nPath || !await pathExists(i18nPath)) {
			return completions;
		}

		const i18nStringPath = path.join(i18nPath, defaultLang, 'strings.xml');

		if (!await pathExists(i18nStringPath)) {
			return completions;
		}
		const document = await workspace.openTextDocument(i18nStringPath);
		const result = await parseXmlString(document.getText()) as { resources: { string: { $: { name: string }; _: string }[] } };
		if (result && result.resources && result.resources.string) {
			for (const value of result.resources.string) {
				completions.push({
					label: value.$.name,
					kind: CompletionItemKind.Reference,
					detail: value._
				});
			}
		}
		return completions;
	}
};

export const imageAutoComplete: AlloyAutoCompleteRule = {
	regExp: /image\s*[:=]\s*["']([\w\s\\/\-_():.]*)['"]?$/,
	requireRange: true,
	rangeRegex: /([\w/.$]+)/,
	async getCompletions (projectDir, range) {
		const rootPath = await projectDir.isAlloyProject() ? path.join(projectDir.filePath, 'app') : projectDir.filePath;
		const assetPath = path.join(rootPath, 'assets');
		const completions: CompletionItem[] = [];
		// limit search to these sub-directories
		let paths = [ 'images', 'iphone', 'android' ];
		paths = [ ...paths.map(aPath => path.join(assetPath, aPath)), assetPath ];

		for (const imgPath of paths) {
			if (!await pathExists(imgPath)) {
				continue;
			}
			const files = walkSync(imgPath, {
				nodir: true,
				filter: item => path.basename(item.path) !== '.DS_Store'
			});
			const images = [];
			for (const file of files) {
				let prefix: string|undefined;
				let scale: string|undefined;
				let suffix: string|undefined;
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
				// TODO: Is it possible to preview the image like the atom plugin? We do this elsewhere right now
				completions.push({
					label: utils.toUnixPath(`${image.prefix}${image.suffix}`.replace(assetPath, '')).replace(/^\/(iphone|android|windows)/, ''),
					kind: CompletionItemKind.File,
					range,
					detail: scales
				});
			}
		}
		return completions;
	}
};
