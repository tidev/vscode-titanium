'use babel';

const vscode = require('vscode');
const path = require('path');

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
		const directory = vscode.workspace.getConfiguration('appcelerator-titanium.build').get('distributionOutputDirectory');
		if (!path.isAbsolute(directory)) {
			return path.join(vscode.workspace.rootPath, directory);
		}
		return directory;
	}
};
