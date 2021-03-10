import * as fs from 'fs-extra';
import * as walkSync from 'klaw-sync';
import * as path from 'path';
import * as semver from 'semver';
import appc from './appc';

import { platform } from 'os';
import { workspace, tasks, Task, ShellExecution } from 'vscode';
import { CreateAppOptions, CreateModuleOptions, Target } from './types/cli';
import { IosCert, IosCertificateType, PlatformPretty } from './types/common';
import { ExtensionContainer } from './container';

/**
 * Returns normalised name for platform
 *
 * @param {String} targetPlatform - Target platform.
 * @returns {String}
 */
export function  normalisedPlatform (targetPlatform: string): string {
	if (targetPlatform === 'iphone' || targetPlatform === 'ipad') {
		return 'ios';
	}
	return targetPlatform.toLowerCase();
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
export function platforms (): string[] {
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
export function nameForPlatform (targetPlatform: string): PlatformPretty {
	targetPlatform =  normalisedPlatform(targetPlatform);
	switch (targetPlatform) {
		case 'android':
			return PlatformPretty.android;
		case 'ios':
			return PlatformPretty.ios;
		default:
			throw new Error(`Unknown platform ${targetPlatform}`);
	}
}

/**
 * Returns the pretty name for a target, used for displaying in the UI.
 * @param {String} target - target to get pretty name for.
 * @returns {String}
 */
export function nameForTarget (target: string): string {
	target = target.toLowerCase();
	switch (target) {
		case 'device':
		case 'emulator':
		case 'simulator':
			return capitalizeFirstLetter(target);
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
 * @param {String} targetPlatform - platform to get target for.
 * @returns {String}
 */
export function targetForName (name: string): Target {
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
			return name as Target;
	}
}

export function targetsForPlatform (platformName: string): string[] {
	platformName = normalisedPlatform(platformName);
	switch (platformName) {
		case 'android':
			return [ 'emulator', 'device', 'dist-playstore' ];
		case 'ios':
			return [ 'simulator', 'device', 'dist-adhoc', 'dist-appstore' ];
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
 * Alloy app directory
 *
 * @returns {String}
 */
export function getAlloyRootPath (): string {
	return path.join(workspace.rootPath!, 'app');
}

/**
 * Returns true if directory exists at given path
 *
 * @param {String} directoryPath 	directory path
 * @returns {Boolean}
 */
export function directoryExists (directoryPath: string): boolean {
	try {
		const stat = fs.statSync(directoryPath);
		return stat.isDirectory();
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}

/**
 * Returns true if current project is an Alloy project
 *
 * @returns {Boolean}
 */
export function isAlloyProject (): boolean {
	return directoryExists(getAlloyRootPath());
}

/**
 * i18n project directory
 *
 * @returns {String}
 */
export function getI18nPath (): string {
	if (isAlloyProject()) {
		return path.join(getAlloyRootPath(), 'i18n');
	} else {
		return path.join(workspace.rootPath!, 'i18n');
	}
}

/**
 * Returns true if file exists at given path
 *
 * @param {String} filePath		file path
 * @returns {Boolean}
 */
export function fileExists (filePath: string): boolean {
	try {
		const stat = fs.statSync(filePath);
		return stat.isFile();
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
		filter: (item: walkSync.Item) => item.stats.isDirectory() || path.extname(item.path) === '.js'
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

export function createAppArguments (options: CreateAppOptions): string[] {
	const subcommand = ExtensionContainer.isUsingTi() ? 'create' : 'new';
	const args = [
		subcommand,
		'--type', 'app',
		'--name', options.name,
		'--id', options.id,
		'--platforms', options.platforms.join(','),
		'--no-prompt',
		'--log-level', options.logLevel
	];

	if (ExtensionContainer.isUsingTi()) {
		args.push('--workspace-dir', normalizeDriveLetter(options.workspaceDir));
	} else {
		args.push('--project-dir', normalizeDriveLetter(path.join(options.workspaceDir, options.name)));
		if (!options.enableServices) {
			args.push('--no-services');
		} else {
			args.push('--no-enable-services');
		}
	}

	if (options.force) {
		args.push('--force');
	}

	return args.map(arg => quoteArgument(arg));
}

export function createModuleArguments (options: CreateModuleOptions): string[] {
	const subcommand = ExtensionContainer.isUsingTi() ? 'create' : 'new';
	const type = ExtensionContainer.isUsingTi() ? 'module' : 'timodule';
	const args = [
		subcommand,
		'--type', type,
		'--name', options.name,
		'--id', options.id,
		'--platforms', options.platforms.join(','),
		'--no-prompt',
		'--log-level', options.logLevel
	];

	if (ExtensionContainer.isUsingTi()) {
		args.push('--workspace-dir', normalizeDriveLetter(options.workspaceDir));
	} else {
		args.push('--project-dir', normalizeDriveLetter(path.join(options.workspaceDir, options.name)));
	}

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
	return new RegExp(test, 'i').test(text);
}

export function isValidPlatform (targetPlatform: string): boolean {
	return fs.pathExistsSync(path.join(workspace.rootPath!, targetPlatform));
}

/**
 * Determine the correct certificate name value to provide to the SDK build process.
 * Prior to SDK 8.2.0 only the "name" property was allowed, but for 8.2.0 and above
 * we should prefer the fullname as it differentiates between the iPhone certs and
 * the generic Apple certs.
 *
 * @param {String} certificateName - Certificate fullname.
 * @param {String} sdkVersion - Projects SDK version in the tiapp.xml.
 * @param {String} certificateType - Type of certificate type to look up, developer or distribution.
 *
 * @returns {String}
 */
export function getCorrectCertificateName (certificateName: string, sdkVersion: string, certificateType: IosCertificateType): string {
	const certificate = appc.iOSCertificates(certificateType).find((cert: IosCert) => cert.fullname === certificateName);

	if (!certificate) {
		throw new Error(`Failed to lookup certificate ${certificateName}`);
	}

	if (semver.gte(semver.coerce(sdkVersion)!, '8.2.0')) {
		return certificate.fullname;
	} else {
		return certificate.name;
	}
}

export async function getNodeSupportedVersion(sdkVersion: string): Promise<string|undefined> {

	const sdkInfo = appc.sdkInfo(sdkVersion);
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
