import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import findUp from 'find-up';
import walkSync from 'klaw-sync';

import { platform } from 'os';
import { tasks, Task, ShellExecution, TaskScope } from 'vscode';
import { CreateOptions, CreateModuleOptions, PrettyDevelopmentTarget, PrettyTarget, Target } from './types/cli';
import { IosCert, IosCertificateType, Platform, PlatformPretty } from './types/common';
import { ExtensionContainer } from './container';

/**
 * Returns normalised name for platform
 *
 * @param {String} targetPlatform - Target platform.
 * @returns {String}
 */
export function  normalisedPlatform (targetPlatform: Platform | 'iphone' | 'ipad'): Lowercase<Platform> {
	if (targetPlatform === 'iphone' || targetPlatform === 'ipad') {
		return 'ios';
	}
	return targetPlatform.toLowerCase() as Lowercase<Platform>;
}

/**
 * Returns string with capitalized first letter
 *
 * @param {String} s - string.
 * @returns {String}
 */
export function  capitalizeFirstLetter (s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Returns available target platforms
 *
 * @returns {Array}
 */
export function platforms (): Platform[] {
	switch (platform()) {
		case 'darwin':
			return [ 'ios', 'android' ];
		case 'win32':
			return [ 'android' ];
		case 'linux':
			return [ 'android' ];
		default:
			return [];
	}
}

/**
 * Returns correct name for given platform
 *
 * @param {String} targetPlatform - target platform.
 * @returns {String}
 */
export function nameForPlatform (targetPlatform: Platform): PlatformPretty {
	targetPlatform =  normalisedPlatform(targetPlatform);
	switch (targetPlatform) {
		case 'android':
			return 'Android';
		case 'ios':
			return 'iOS';
		default:
			throw new Error(`Unknown platform ${targetPlatform}`);
	}
}

/**
 * Returns the pretty name for a target, used for displaying in the UI.
 * @param {String} target - target to get pretty name for.
 * @returns {String}
 */
export function nameForTarget (target: Target): PrettyTarget {
	const lowerCaseTarget: Lowercase<Target> = target.toLowerCase() as Lowercase<Target>;
	switch (lowerCaseTarget) {
		case 'device':
		case 'emulator':
		case 'simulator':
			return capitalizeFirstLetter(target) as PrettyDevelopmentTarget;
		case 'macos':
			return 'macOS';
		case 'dist-adhoc':
			return 'Ad-Hoc';
		case 'dist-appstore':
			return 'App Store';
		case 'dist-macappstore':
			return 'macOS App Store';
		case 'dist-playstore':
			return 'Play Store';
		default:
			throw new Error(`Unknown target ${target}`);
	}
}

/**
 * Returns the target name based off a pretty name in the UI.
 * @param {String} name - name to get target for.
 * @param {String} targetPlatform - platform to get target for.
 * @returns {String}
 */
export function targetForName (name: PrettyTarget): Target {
	const lowerCaseName: Lowercase<PrettyTarget> = name.toLowerCase() as Lowercase<PrettyTarget>;
	switch (lowerCaseName) {
		case 'ad-hoc':
			return 'dist-adhoc';
		case 'app store':
			return 'dist-appstore';
		case 'play store':
			return 'dist-playstore';
		case 'macos app store':
			return 'dist-macappstore';
		case 'device':
		case 'emulator':
		case 'simulator':
		default:
			return lowerCaseName as Target;
	}
}

export function targetsForPlatform (platformName: Platform): Target[] {
	const lowerCasePlatform = normalisedPlatform(platformName);
	switch (lowerCasePlatform) {
		case 'android':
			return [ 'emulator', 'device', 'dist-playstore' ];
		case 'ios':
			return [ 'simulator', 'device', 'macos', 'dist-adhoc', 'dist-appstore', 'dist-macappstore' ];
		default:
			return [];
	}
}

/**
 * iOS provisioning profile matches App ID
 *
 * @param {String} profileAppId 	app ID of provisioing profile
 * @param {String} appId 			app ID
 * @returns {Boolean}
 */
export function iOSProvisioningProfileMatchesAppId (profileAppId: string, appId: string): boolean {

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
 * Convert to unix path
 *
 * @param {String} p 	path
 * @returns {String}
 */
export function toUnixPath (p: string): string { // https://github.com/anodynos/upath
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
export function getAllKeys (obj: Record<string, unknown>): string[] {
	if (typeof obj !== 'object') {
		return [];
	}
	const result = [];
	for (const [ key, value ] of Object.entries(obj)) {
		result.push(key);
		if (typeof value === 'object' && value !== null) {
			for (const val of getAllKeys(value as Record<string, unknown>)) {
				result.push(key + '.' + val);
			}
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
export function filterJSFiles (directory: string): readonly walkSync.Item[] {
	return walkSync(directory, {
		nodir: true,
		filter: (item: walkSync.Item) => {
			if (item.stats.isDirectory()) {
				return true;
			}
			const isJsFile = path.extname(item.path) === '.js';
			const tsFile = item.path.replace(/\.js$/, '.ts');
			if ((isJsFile && !fs.existsSync(tsFile)) || (!isJsFile && fs.existsSync(tsFile))) {
				return true;
			}
			return false;
		}
	});
}

export function normalizeDriveLetter (filePath: string): string {
	if (process.platform !== 'win32') {
		return filePath;
	}
	const { root } = path.parse(filePath);
	return `${root.substr(0, 1).toUpperCase()}${filePath.slice(1)}`;
}

export function quoteArgument (arg: string): string {
	return `"${arg}"`;
}

export function createAppArguments (options: CreateOptions): string[] {
	const args = [
		'create',
		'--type', 'app',
		'--name', options.name,
		'--id', options.id,
		'--platforms', options.platforms.join(','),
		'--no-prompt',
		'--log-level', options.logLevel
	];

	args.push('--workspace-dir', normalizeDriveLetter(options.workspaceDir));

	if (options.force) {
		args.push('--force');
	}

	return args.map(arg => quoteArgument(arg));
}

export function createModuleArguments (options: CreateModuleOptions): string[] {
	const args = [
		'create',
		'--type', 'module',
		'--name', options.name,
		'--id', options.id,
		'--platforms', options.platforms.join(','),
		'--no-prompt',
		'--log-level', options.logLevel
	];

	args.push('--workspace-dir', normalizeDriveLetter(options.workspaceDir));

	if (options.codeBases?.android) {
		args.push('--android-code-base', options.codeBases.android);
	}

	if (options.codeBases?.ios) {
		args.push('--ios-code-base', options.codeBases.ios);
	}

	if (options.force) {
		args.push('--force');
	}
	return args.map(arg => quoteArgument(arg));
}

export function validateAppId (appId: string): boolean {
	// TODO: Document this, add Java keyword detection, return what's wrong rather than true/false?
	if (!/^([a-zA-Z_]{1}[a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+)$/.test(appId)) {
		return false;
	}
	return true;
}

/**
 * Matches
 *
 * @param {String} text text to test
 * @param {String} test text to match against
 *
 * @returns {Boolean}
 */
export function matches (text: string, test: string): boolean {
	// eslint-disable-next-line security/detect-non-literal-regexp
	return new RegExp(test, 'i').test(text);
}

export async function getNodeSupportedVersion(): Promise<string|undefined> {
	// TODO: we'll just take the first app project for now and use that as the supported range,
	// this should potentially be improved in future to collate the various supported ranges,
	// but that's a much more invasive change
	let sdkVersion;
	for (const proj of ExtensionContainer.projects.values()) {
		if (proj.type !== 'app') {
			continue;
		}
		sdkVersion = proj.sdk()[0];
	}

	if (!sdkVersion) {
		return;
	}

	const sdkInfo = ExtensionContainer.environment.sdkInfo(sdkVersion);
	if (!sdkInfo) {
		return;
	}
	const sdkPath = sdkInfo.path;
	const packageJSON = path.join(sdkPath, 'package.json');
	const { vendorDependencies } = await fs.readJSON(packageJSON);
	return vendorDependencies.node;
}

export async function executeAsTask(command: string, name: string): Promise<void> {

	const task = new Task(
		{ type: 'shell' },
		TaskScope.Global,
		name,
		'Updates',
		new ShellExecution(command)
	);

	const taskExecution = await tasks.executeTask(task);

	const taskEndPromise = new Promise<void>((resolve) => {
		const disposable = tasks.onDidEndTaskProcess(e => {
			if (e.execution === taskExecution) {
				disposable.dispose();
				resolve();
			}
		});
	});
	return taskEndPromise;
}

/**
 * Maps a device ID to the device name reported in ti info output
 *
 * @export
 * @param {string} deviceID - The device ID
 * @param {Platform} platform - The platform the device belongs to
 * @param {string} target - The target type the device belongs to
 * @returns {string}
 */
export function getDeviceNameFromId (deviceID: string, platform: Platform, target: string): string {
	let deviceName: string|undefined;
	if (platform === 'android' && target === 'device') {
		deviceName = (ExtensionContainer.environment.androidDevices().find(device => device.id === deviceID))?.name;
	} else if (platform === 'android' && target === 'emulator') {
		deviceName = (ExtensionContainer.environment.androidEmulators().AVDs.find(emulator => emulator.id === deviceID))?.name;
	} else if (platform === 'ios' && target === 'device') {
		deviceName = (ExtensionContainer.environment.iOSDevices().find(device => device.udid === deviceID))?.name;
	} else if (platform === 'ios' && target === 'simulator') {
		for (const simVer of ExtensionContainer.environment.iOSSimulatorVersions()) {
			deviceName = (ExtensionContainer.environment.iOSSimulators()[simVer].find(simulator => simulator.udid === deviceID))?.name;
			if (deviceName) {
				deviceName = `${deviceName} (${simVer})`;
				break;
			}
		}
	}

	if (!deviceName) {
		throw new Error(`Unable to find a name for ${deviceID}`);
	}

	return deviceName;
}

/*
 * Given a file path, will walk the file tree until it finds a tiapp.xml, and will return the
 * parent directory of that tiapp.xml. Useful for helping to work backwards from a file that has
 * triggered completions to a project.
 *
 * @export
 * @param {string} filePath - The file path to start from
 * @returns {Promise<string>} The parent directory
 */
export async function findProjectDirectory (filePath: string): Promise<string> {
	try {
		const tiappFile = await findUp('tiapp.xml', { cwd: filePath, type: 'file' });
		if (!tiappFile) {
			throw new Error(`Unable to find project dir for ${filePath}`);
		}

		return path.dirname(tiappFile);
	} catch (error) {
		console.log(error);
		throw error;
	}
}
