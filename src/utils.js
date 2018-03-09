const { workspace } = require('vscode');
const path = require('path');
const _ = require('underscore');
const fs = require('fs');
const { platform } = require('os');

module.exports = {

	/**
	 * Returns available target platforms
	 *
	 * @returns {Array}
	 */
	platforms () {
		switch (platform()) {
			case 'darwin':
				return [ 'ios', 'android' ];
			case 'win32':
				return [ 'android', 'windows' ];
			case 'linux':
				return [ 'android' ];
		}
	},

	/**
	 * Returns correct name for given platform
	 *
	 * @param {String} platform 	target platform
	 * @returns {String}
	 */
	nameForPlatform (platform) {
		platform = this.normalisedPlatform(platform);
		switch (platform) {
			case 'android':
				return 'Android';
			case 'ios':
				return 'iOS';
			case 'windows':
				return 'Windows';
		}
	},

	/**
	 * Returns normalised name for platform
	 *
	 * @param {String} platform 	target platform
	 * @returns {String}
	 */
	normalisedPlatform (platform) {
		if (platform === 'iphone' || platform === 'ipad') {
			return 'ios';
		}
		return platform.toLowerCase();
	},

	/**
	 * iOS provisioning profile matches App ID
	 *
	 * @param {String} profileAppId 	app ID of provisioing profile
	 * @param {String} appId 			app ID
	 * @returns {Boolean}
	 */
	iOSProvisioinngProfileMatchesAppId(profileAppId, appId) {

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
	},

	/**
	 * Distribution output directory. Builds absolute path.
	 *
	 * @returns {String}
	 */
	distributionOutputDirectory() {
		const directory = workspace.getConfiguration('appcelerator-titanium.build').get('distributionOutputDirectory');
		if (!path.isAbsolute(directory)) {
			return path.join(workspace.rootPath, directory);
		}
		return directory;
	},

	/**
	 * Returns string with capitalized first letter
	 *
	 * @param {String} string 	string
	 * @returns {String}
	 */
	capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	},

	/**
	 * Alloy app directory
	 *
	 * @returns {String}
	 */
	getAlloyRootPath() {
		return path.join(workspace.rootPath, 'app');
	},

	/**
	 * Returns true if current project is an Alloy project
	 *
	 * @returns {Boolean}
	 */
	isAlloyProject() {
		return this.directoryExists(this.getAlloyRootPath());
	},

	/**
	 * i18n project directory
	 *
	 * @returns {String}
	 */
	getI18nPath() {
		if (this.isAlloyProject()) {
			return path.join(this.getAlloyRootPath(), 'i18n');
		}
	},

	/**
	 * Returns true if file exists at given path
	 *
	 * @param {String} path		file path
	 * @returns {Boolean}
	 */
	fileExists(path) {
		try {
			var stat = fs.statSync(path);
			return stat.isFile();
		} catch (err) {
			return !(err && err.code === 'ENOENT');
		}
	},

	/**
	 * Returns true if directory exists at given path
	 *
	 * @param {String} path 	directory path
	 * @returns {Boolean}
	 */
	directoryExists(path) {
		try {
			var stat = fs.statSync(path);
			return stat.isDirectory();
		} catch (err) {
			return !(err && err.code === 'ENOENT');
		}
	},

	/**
	 * Convert to unix path
	 *
	 * @param {String} p 	path
	 * @returns {String}
	 */
	toUnixPath(p) { // https://github.com/anodynos/upath
		let double = /\/\//;
		p = p.replace(/\\/g, '/');
		while (p.match(double)) {
			p = p.replace(double, '/');
		}
		return p;
	},

	/**
	 * Returns recursive keys from given object
	 *
	 * @param {Object} obj 	object to get keys of
	 * @returns {Array}
	 */
	getAllKeys(obj) {
		if (!_.isObject(obj)) {
			return [];
		}
		const result = [];
		_.each(obj, function (value, key) {
			result.push(key);
			_.each(module.exports.getAllKeys(value), function (value) {
				result.push(key + '.' + value);
			});
		});
		return result;
	},
};
