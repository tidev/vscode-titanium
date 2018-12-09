import * as fs from 'fs-extra';
import * as walkSync from 'klaw-sync';
import * as path from 'path';
import * as _ from 'underscore';

import { platform } from 'os';
import { workspace } from 'vscode';

/**
 * Returns available target platforms
 *
 * @returns {Array}
 */
export function platforms () {
	switch (platform()) {
		case 'darwin':
			return [ 'ios', 'android' ];
		case 'win32':
			return [ 'android', 'windows' ];
		case 'linux':
			return [ 'android' ];
	}
}

/**
 * Returns correct name for given platform
 *
 * @param {String} platform - target platform.
 * @returns {String}
 */
export function nameForPlatform (targetPlatform: string) {
	targetPlatform =  this.normalisedPlatform(targetPlatform);
	switch (targetPlatform) {
		case 'android':
			return 'Android';
		case 'ios':
			return 'iOS';
		case 'windows':
			return 'Windows';
	}
}

/**
 * Returns the pretty name for a target, used for displaying in the UI.
 * @param {String} target - target to get pretty name for.
 * @returns {String}
 */
export function nameForTarget (target: string) {
	target = target.toLowerCase();
	switch (target) {
		case 'device':
		case 'emulator':
		case 'simulator':
			return this.capitalizeFirstLetter(target);
		case 'dist-adhoc':
			return 'Ad-Hoc';
		case 'dist-appstore':
			return 'App Store';
		case 'dist-playstore':
			return 'Play Store';
		default:
			return target;
	}
}

/**
 * Returns the target name based off a pretty name in the UI.
 * @param {String} name - name to get target for.
 * @returns {String}
 */
export function targetForName (name: string) {
	name = name.toLowerCase();
	switch (name) {
		case 'Ad-Hoc':
			return 'dist-adhoc';
		case 'App Store':
			return 'dist-appstore';
		case 'Play Store':
			return 'dist-playstore';
		case 'device':
		case 'emulator':
		case 'simulator':
		default:
			return name;
	}
}

/**
 * Returns normalised name for platform
 *
 * @param {String} targetPlatform - Target platform.
 * @returns {String}
 */
export function  normalisedPlatform (targetPlatform: string) {
	if (targetPlatform === 'iphone' || targetPlatform === 'ipad') {
		return 'ios';
	}
	return targetPlatform.toLowerCase();
}

/**
 * iOS provisioning profile matches App ID
 *
 * @param {String} profileAppId 	app ID of provisioing profile
 * @param {String} appId 			app ID
 * @returns {Boolean}
 */
export function iOSProvisioinngProfileMatchesAppId (profileAppId: string, appId: string) {

	// allow wildcard
	if (String(profileAppId) === '*') {
		return true;
	}

	// allow explicit match
	if (String(profileAppId) === appId) {
		return true;
	}

	// limited wildcard
	if (profileAppId.indexOf('*') === profileAppId.length - 1) {
		const profileAppIdPrefix = profileAppId.substr(0, profileAppId.length - 1);
		if (appId.indexOf(profileAppIdPrefix) === 0) {
			return true;
		}
	}

	return false;
}

/**
 * Distribution output directory. Builds absolute path.
 *
 * @returns {String}
 */
export function  distributionOutputDirectory () {
	const directory: string = workspace.getConfiguration('titanium.package').get('distributionOutputDirectory');
	if (!path.isAbsolute(directory)) {
		return path.join(workspace.rootPath, directory);
	}
	return directory;
}

/**
 * Returns string with capitalized first letter
 *
 * @param {String} s - string.
 * @returns {String}
 */
export function  capitalizeFirstLetter (s: string) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Alloy app directory
 *
 * @returns {String}
 */
export function getAlloyRootPath () {
	return path.join(workspace.rootPath, 'app');
}

/**
 * Returns true if current project is an Alloy project
 *
 * @returns {Boolean}
 */
export function isAlloyProject () {
	return this.directoryExists(this.getAlloyRootPath());
}

/**
 * i18n project directory
 *
 * @returns {String}
 */
export function getI18nPath () {
	if (this.isAlloyProject()) {
		return path.join(this.getAlloyRootPath(), 'i18n');
	}
}

/**
 * Returns true if file exists at given path
 *
 * @param {String} path		file path
 * @returns {Boolean}
 */
export function fileExists (filePath: string) {
	try {
		const stat = fs.statSync(filePath);
		return stat.isFile();
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}

/**
 * Returns true if directory exists at given path
 *
 * @param {String} path 	directory path
 * @returns {Boolean}
 */
export function directoryExists (directoryPath: string) {
	try {
		const stat = fs.statSync(directoryPath);
		return stat.isDirectory();
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}

/**
 * Convert to unix path
 *
 * @param {String} p 	path
 * @returns {String}
 */
export function toUnixPath (p: string) { // https://github.com/anodynos/upath
	const double = /\/\//;
	p = p.replace(/\\/g, '/');
	while (p.match(double)) {
		p = p.replace(double, '/');
	}
	return p;
}

/**
 * Returns recursive keys from given object
 *
 * @param {Object} obj 	object to get keys of
 * @returns {Array}
 */
export function getAllKeys (obj: object) {
	if (!_.isObject(obj)) {
		return [];
	}
	const result = [];
	for (const [ key, value ] of Object.entries(obj)) {
		result.push(key);
		for (const val of getAllKeys(value)) {
			result.push(key + '.' + val);
		}
	}
	return result;
}

/**
 * Search a directory recursively for all JS files, filtering out directories
 * from the results.
 * @param {String} directory - Directory to search for files in.
 * @returns {Array<Object>} Array of objects of the structure { path, stats}, where path is the full path,
 * and stats is an fs.stats object.
 */
export function filterJSFiles (directory: string) {
	return walkSync(directory, {
		nodir: true,
		filter: (item: walkSync.Item) => item.stats.isDirectory() || path.extname(item.path) === '.js'
	});
}
