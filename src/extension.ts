import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import appc from './appc';
import DeviceExplorer from './explorer/tiExplorer';
import project from './project';
import * as related from './related';
import Terminal from './terminal';
import * as utils from './utils';

import * as completionItemProviderHelper from './providers/completion/completionItemProviderHelper';
import { ControllerCompletionItemProvider } from './providers/completion/controllerCompletionItemProvider';
import { StyleCompletionItemProvider } from './providers/completion/styleCompletionItemProvider';
import { TiappCompletionItemProvider } from './providers/completion/tiappCompletionItemProvider';
import { ViewCompletionItemProvider } from './providers/completion/viewCompletionItemProvider';

import { ControllerDefinitionProvider } from './providers/definition/controllerDefinitionProvider';
import * as definitionProviderHelper from './providers/definition/definitionProviderHelper';
import { StyleDefinitionProvider } from './providers/definition/styleDefinitionProvider';
import { ViewCodeActionProvider } from './providers/definition/viewCodeActionProvider';
import { ViewDefinitionProvider } from './providers/definition/viewDefinitionProvider';

const openDashboardCommandId = 'titanium.openDashboard';

let extensionContext: vscode.ExtensionContext;
let projectStatusBarItem;
let terminal;
/**
 * Activate
 *
 * @param {Object} context 	extension context
 */
function activate (context) {
	extensionContext = context;
	project.load();
	setStatusBar();
	project.onModified(setStatusBar);
	// definitionProviderHelper.activate(context.subscriptions);

	if (!project.isTitaniumProject()) {
		vscode.commands.executeCommand('setContext', 'titanium:enabled', false);
	} else {
		vscode.commands.executeCommand('setContext', 'titanium:enabled', true);
	}

	const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
	const styleFilePattern = '**/*.tss';
	const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';
	const deviceExplorer = new DeviceExplorer();
	context.subscriptions.push(
		// register completion providers
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCompletionItemProvider(), '.', '\'', '"'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleCompletionItemProvider()),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: controllerFilePattern }, new ControllerCompletionItemProvider(), '.', '\'', '"', '/'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: '**/tiapp.xml' }, new TiappCompletionItemProvider(), '.'),

		// register hover providers
		// vscode.languages.registerHoverProvider({ scheme: 'file', pattern: '**/{*.xml,*.tss,*.js}' }, definitionProviderHelper),

		// register definition providers
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewDefinitionProvider()),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleDefinitionProvider()),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: controllerFilePattern }, new ControllerDefinitionProvider()),

		// register code action providers
		vscode.languages.registerCodeActionsProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCodeActionProvider()),

		// register init command
		vscode.commands.registerCommand('titanium.init', init),

		// register run command
		vscode.commands.registerCommand('titanium.build.run', async (runOpts = {}) => {
			if (checkLoginAndPrompt()) {
				return;
			}

			if (appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}
			const iOSSimVersion = runOpts.version;
			const runOptions: any = {
				buildType: 'run',
				platform: runOpts.platform,
				target: runOpts.targetId,
				deviceId: runOpts.deviceId,
				deviceLabel: runOpts.platform === 'ios' ? `${runOpts.label} (${runOpts.version})` : runOpts.label,
				liveview: extensionContext.globalState.get('titanium:liveview')
			};

			let last;
			const lastOptions = extensionContext.workspaceState.get('lastRunOptions');

			if (lastOptions) {
				last = {
					label: 'Last run',
					description: lastRunDescription(lastOptions)
				};
			}

			if (!runOptions.platform) {
				const platform: any = await selectPlatform(last);

				if (!platform) {
					return;
				}

				if (platform.id === 'last') {
					run(lastOptions);
					return;
				}

				runOptions.platform = platform.id;
			}

			if (project.isTitaniumModule) {
				run(runOptions);
				return;
			}

			if (!runOptions.target) {
				const target = await selectTarget(runOptions.platform);

				if (!target) {
					return;
				}

				runOptions.target = target.id;
			}

			if (!runOptions.deviceId && runOptions.target !== 'ws-local') {
				let deviceId;
				if (runOptions.platform === 'ios') {
					if (runOptions.target === 'simulator') {
						deviceId = await selectiOSSimulator(iOSSimVersion);
					} else if (runOptions.target === 'device') {
						deviceId = await selectiOSDevice();
					}
				} else if (runOptions.platform === 'android') {
					if (runOptions.target === 'emulator') {
						deviceId = await selectAndroidEmulator();
					} else if (runOptions.target === 'device') {
						deviceId = await selectAndroidDevice();
					}
				}

				if (!deviceId) {
					return;
				}

				runOptions.deviceId = deviceId.udid;
				runOptions.deviceLabel = deviceId.label;
			}

			if (runOptions.platform === 'ios' && runOptions.target === 'device') {
				const { certificate, provisioning } = await selectiOSCodeSigning(runOptions);
				if (!certificate || !provisioning) {
					return;
				}
				runOptions.certificate = certificate;
				runOptions.provisioningProfile = provisioning;
			}

			extensionContext.workspaceState.update('lastRunOptions', runOptions);
			run(runOptions);
		}),

		// register distribute command
		vscode.commands.registerCommand('titanium.package.run', async (runOpts = {}) => {
			if (checkLoginAndPrompt()) {
				return;
			}

			if (appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			if (project.isTitaniumModule) {
				vscode.window.showErrorMessage('Use run command to build native module');
				return;
			}

			const runOptions: any = {
				buildType: 'dist',
				platform: runOpts.platform
			};

			let last;
			const lastOptions = extensionContext.workspaceState.get('lastDistOptions');
			if (lastOptions) {
				last = {
					label: 'Last build',
					description: lastDistDescription(lastOptions)
				};
			}
			if (!runOptions.platform) {
				const platform: any = await selectPlatform(last);
				if (!platform) {
					return;
				}
				if (platform.id === 'last') {
					run(lastOptions);
					return;
				}
				runOptions.platform = platform.id;
			}

			if (runOptions.platform === 'ios') {
				const target = await selectiOSDistribution();
				if (!target) {
					return;
				}
				runOptions.target = target.id;
				const profile = await selectiOSCodeSigning(runOptions);
				if (!profile) {
					return;
				}
				runOptions.provisioningProfile = profile.provisioning;
				runOptions.certificate = profile.certificate;
			} else if (runOptions.platform === 'android') {
				runOptions.target = 'dist-playstore';
				runOptions.keystore = {};
				const lastKeystorePath = extensionContext.workspaceState.get('lastKeystorePath');
				const keyStorePath = await selectAndroidKeystore(lastKeystorePath);
				if (keyStorePath) {
					runOptions.keystore.path = keyStorePath;
					const alias = await vscode.window.showInputBox({ placeHolder: 'Keystore alias' });
					if (!alias || !alias.length) {
						return;
					}
					runOptions.keystore.alias = alias;
					const password = await vscode.window.showInputBox({ placeHolder: 'Keystore password', password: true });
					if (!password || !password.length) {
						return;
					}
					runOptions.keystore.password = password;
					const privateKeyPassword = await vscode.window.showInputBox({ placeHolder: 'Private key password', password: true });
					if (!privateKeyPassword || !privateKeyPassword.length) {
						return;
					}
					runOptions.keystore.privateKeyPassword = privateKeyPassword;
				}
			}
			extensionContext.workspaceState.update('lastDistOptions', runOptions);
			run(runOptions);
		}),

		// register stop command
		vscode.commands.registerCommand('titanium.build.stop', () => {
			if (vscode.workspace.getConfiguration('titanium.general').get('useTerminalForBuild')) {
				if (terminal) {
					terminal.clear();
				}
			} else {
				appc.stop();
			}
		}),

		// register set log level command
		vscode.commands.registerCommand('titanium.build.setLogLevel', async () => {
			const level = await vscode.window.showQuickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], { placeHolder: 'Select log level' });
			if (level) {
				extensionContext.globalState.update('logLevel', level.toLowerCase());
			}
		}),

		// register related view commands
		vscode.commands.registerCommand('titanium.alloy.openRelatedView', () => {
			related.openRelatedFile('xml');
		}),
		vscode.commands.registerCommand('titanium.alloy.openRelatedStyle', () => {
			related.openRelatedFile('tss');
		}),
		vscode.commands.registerCommand('titanium.alloy.openRelatedController', () => {
			related.openRelatedFile('js');
		}),
		vscode.commands.registerCommand('titanium.alloy.openRelatedFiles', () => {
			related.openAllFiles();
		}),

		// register generate autocomplete suggestions command
		vscode.commands.registerCommand('titanium.generate.autocompletEsuggestions', async () => {
			await generateCompletions({ force: true });
		}),

		vscode.commands.registerCommand(openDashboardCommandId, () => {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(project.dashboardUrl()));
		}),

		vscode.window.registerTreeDataProvider('titaniumExplorer', deviceExplorer),

		vscode.commands.registerCommand('titanium.explorer.refresh', () => {
			deviceExplorer.refresh();
		}),

		vscode.commands.registerCommand('titanium.build.setLiveViewEnabled', async () => {
			await extensionContext.globalState.update('titanium:liveview', true);
			await vscode.commands.executeCommand('setContext', 'titanium:liveview', true);
			vscode.window.showInformationMessage('Enabled LiveView');
		}),

		vscode.commands.registerCommand('titanium.build.setLiveViewDisabled', async () => {
			await extensionContext.globalState.update('titanium:liveview', false);
			await vscode.commands.executeCommand('setContext', 'titanium:liveview', false);
			vscode.window.showInformationMessage('Disabled LiveView');
		}),

		vscode.commands.registerCommand('titanium.alloy.generate.controller', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter the name for your controller' });
			if (!name) {
				return;
			}
			const cwd = vscode.workspace.rootPath;
			const filePath = path.join(cwd, 'app', 'controllers', `${name}.js`);
			if (await fs.exists(filePath)) {
				const shouldDelete = await vscode.window.showQuickPick([ 'Yes', 'No' ], { placeHolder: `Controller ${name} already exists. Overwrite it?` });
				if (shouldDelete.toLowerCase() !== 'yes' || shouldDelete.toLowerCase() === 'y') {
					return;
				}
			}
			try {
				await appc.generate({
					cwd,
					type: 'controller',
					name,
					force: true
				});
				const shouldOpen = await vscode.window.showInformationMessage(`Controller ${name} created succesfully`, { title: 'Open' });
				if (shouldOpen) {
					const document = await vscode.workspace.openTextDocument(filePath);
					await vscode.window.showTextDocument(document);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create Alloy controller ${name}`);
			}
		}),

		vscode.commands.registerCommand('titanium.alloy.generate.migration', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter the name for your migration' });
			if (!name) {
				return;
			}
			try {
				await appc.generate({
					cwd: vscode.workspace.rootPath,
					type: 'migration',
					name
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create Alloy migration ${name}`);
			}
		}),

		vscode.commands.registerCommand('titanium.alloy.generate.model', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter the name for your model' });
			if (!name) {
				return;
			}
			const adapterType = await vscode.window.showQuickPick([ 'sql', 'properties' ], { placeHolder: 'Select the adapter type' });
			if (!adapterType) {
				return;
			}
			try {
				await appc.generate({
					cwd: vscode.workspace.rootPath,
					type: 'model',
					name,
					adapterType
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create Alloy controller ${name}`);
			}
		}),

		vscode.commands.registerCommand('titanium.alloy.generate.style', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter the name for your style' });
			if (!name) {
				return;
			}
			try {
				await appc.generate({
					cwd: vscode.workspace.rootPath,
					type: 'style',
					name
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create Alloy style ${name}`);
			}
		}),

		vscode.commands.registerCommand('titanium.alloy.generate.view', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter the name for your view' });
			if (!name) {
				return;
			}
			try {
				await appc.generate({
					cwd: vscode.workspace.rootPath,
					type: 'view',
					name
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create Alloy view ${name}`);
			}
		}),

		vscode.commands.registerCommand('titanium.alloy.generate.widget', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter the name for your widget' });
			if (!name) {
				return;
			}
			try {
				await appc.generate({
					cwd: vscode.workspace.rootPath,
					type: 'widget',
					name
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create Alloy widget ${name}`);
			}
		})
	);

	init();
}
exports.activate = activate; // eslint-disable-line no-undef

/**
 * Deactivate
 */
function deactivate () {
	project.dispose();
}
exports.deactivate = deactivate;  // eslint-disable-line no-undef

/**
 * Initialise extension - fetch appc info
 */
function init () {
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, async progress => {
		if (await extensionContext.globalState.get('titanium:liveview')) {
			await vscode.commands.executeCommand('setContext', 'titanium:liveview', true);
		}
		appc.getInfo(async info => {
			if (info) {
				await generateCompletions({ progress });
				// Call refresh incase the Titanium Explorer activity pane became active before info
				await vscode.commands.executeCommand('titanium.explorer.refresh');
			} else {
				vscode.window.showErrorMessage('Error fetching Appcelerator environment');
			}
		});
	});
}

/**
 * Set project name and link to dashboard in status bar
 */
function setStatusBar () {
	if (!projectStatusBarItem) {
		projectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	}
	if (project.isTitaniumApp) {
		projectStatusBarItem.text = `$(device-mobile)  ${project.appName()} (${project.sdk()})`;
		if (project.dashboardUrl()) {
			projectStatusBarItem.command = openDashboardCommandId;
			projectStatusBarItem.tooltip = 'Open Axway Dashboard';
		} else {
			projectStatusBarItem.comand = null;
			projectStatusBarItem.tooltip = null;
		}
		projectStatusBarItem.show();
	} else if (project.isTitaniumModule) {
		projectStatusBarItem.text = `$(package) ${project.appName()}`;
	}
	projectStatusBarItem.show();
}

/**
 * Select platform or last destination
 *
 * @param {Array} platforms valid build platforms
 * @param {Object} last last build destination
 *
 * @returns {Thenable}
 */
function selectPlatform (last: any) {
	const platforms = utils.platforms();

	const items = platforms.map(platform => {
		return { label: utils.nameForPlatform(platform), id: platform };
	});

	if (items.length === 1) {
		return new Promise(resolve => {
			resolve(items[0]);
		});
	}

	const opts = { placeHolder: 'Select platform' };

	if (last) {
		items.splice(0, 0, {
			label: last.label,
			// description: last.description, FIXME!
			id: 'last'
		});
		opts.placeHolder = 'Select platform or last destination';
	}

	return vscode.window.showQuickPick(items, opts);
}

/**
 * Returns description for last run
 *
 * @param {Object} opts run options
 * @returns {String} The description for the last run
 */
function lastRunDescription (opts) {
	return `${utils.nameForPlatform(opts.platform)} ${utils.nameForTarget(opts.target)} ${opts.deviceLabel}`;
}

/**
 * Returns description for last distribution build
 *
 * @param {Object} opts run options
 * @returns {String} The description for the last distribution build
 */
function lastDistDescription (opts) {
	if (opts.platform.id === 'ios') {
		return `iOS (${opts.certificate.name} | ${opts.provisioningProfile.label})`;
	} else {
		return `${opts.platform.label}`;
	}
}

/**
 * Select target: simulator/emulator or device
 *
 * @param {String} platform - Platform that is being built to.
 * @returns {Thenable}
 */
function selectTarget (platform) {
	return vscode.window.showQuickPick([ {
		label: (platform === 'android') ? 'Emulator' : 'Simulator',
		id: (platform === 'android') ? 'emulator' : 'simulator'
	},
	{
		label: 'Device',
		id: 'device'
	} ], { placeHolder: 'Select target' });
}

/**
 * Select iOS simulator
 *
 * @param {String} version - The version of the iOS simulator to show.
 * @returns {Thenable}
 */
async function selectiOSSimulator (version) {
	if (!appc.iOSSimulators() || appc.iOSSimulators() === {}) {
		vscode.window.showErrorMessage('Error fetching iOS simulators. Check your environment and run `Appcelerator: init`.');
		return;
	}
	if (!version) {
		version = await vscode.window.showQuickPick(appc.iOSSimulatorVersions(), { placeHolder: 'Select iOS version' });
	}

	const simulators = appc.iOSSimulators()[version].map(simulator => {
		return {
			udid: simulator.udid,
			label: `${simulator.name} (${version})`,
			version
		};
	});
	return vscode.window.showQuickPick(simulators, { placeHolder: 'Select simulator' });
}

/**
 * Select iOS device
 *
 * @returns {Thenable}
 */
function selectiOSDevice () {
	const devices = appc.iOSDevices().map(device => {
		return {
			udid: device.udid,
			label: device.name
		};
	});
	return vscode.window.showQuickPick(devices, { placeHolder: 'Select device' });
}

/**
 * Select iOS code signing: certificate and provisioning profile
 *
 * @returns {Thenable}
 */
async function selectiOSCodeSigning ({ buildType, target }) {
	const selectedCertificate = await selectiOSCertificate(buildType);
	if (!selectedCertificate) {
		return;
	}

	const certificate = appc.iOSCertificates(buildType === 'run' ? 'developer' : 'distribution').find(cert => cert.pem === selectedCertificate.pem);

	const provisioning = await selectiOSProvisioningProfile({ certificate, target });
	if (!provisioning) {
		return;
	}
	return {
		certificate,
		provisioning
	};
}

/**
 * Select iOS certificate
 *
 * @param {String} buildType - Type of build being performed, either run or dist.
 * @returns {Thenable}
 */
function selectiOSCertificate (buildType) {
	const certificates = appc.iOSCertificates(buildType === 'run' ? 'developer' : 'distribution').map(certificate => {
		return {
			label: `${certificate.name}`,
			description: `expires ${new Date(certificate.after).toLocaleString('en-US')}`,
			pem: certificate.pem
		};
	});
	return vscode.window.showQuickPick(certificates, { placeHolder: 'Select certificate' });
}

/**
 * Select iOS provisioning profile
 *
 * @returns {Thenable}
 */
function selectiOSProvisioningProfile ({ certificate, target }) {
	const profiles = [];
	let deployment = 'development';
	if (target === 'dist-adhoc') {
		deployment = 'distribution';
	} else if (target === 'dist-appstore') {
		deployment = 'appstore';
	}
	appc.iOSProvisioningProfiles(deployment, certificate, project.appId()).forEach(profile => {
		if (!profile.disabled) {
			const item: any = {
				label: profile.name,
				description: profile.uuid,
				uuid: profile.uuid
			};
			if (vscode.workspace.getConfiguration('titanium.iOS').get('showProvisioningProfileDetail')) {
				item.detail = `expires ${new Date(profile.expirationDate).toLocaleString('en-US')} | ${profile.appId}`;
			}
			profiles.push(item);
		}
	});
	return vscode.window.showQuickPick(profiles, { placeHolder: 'Select provisioning profile' });
}

/**
 * Select Android emulator
 *
 * @returns {Thenable}
 */
function selectAndroidEmulator () {
	const emulators: any = appc.androidEmulators();
	const options = [];

	for (const emulator of emulators.AVDs) {
		options.push({
			udid: emulator.id,
			label: emulator.name
		});
	}

	for (const emulator of emulators.Genymotion) {
		options.push({
			udid: emulator.id,
			label: emulator.name
		});
	}

	if (!options.length) {
		vscode.window.showErrorMessage('No Android emulators detected');
		return;
	}

	return vscode.window.showQuickPick(options, { placeHolder: 'Select emulator' });
}

/**
 * Select Android device
 *
 * @returns {Thenable}
 */
function selectAndroidDevice () {
	const devices = appc.androidDevices().map(device => {
		return {
			udid: device.id,
			label: device.name
		};
	});

	if (!devices.length) {
		vscode.window.showErrorMessage('No Android devices connected');
		return;
	}

	return vscode.window.showQuickPick(devices, { placeHolder: 'Select device' });
}

/**
 * Select iOS distribution
 *
 * @returns {Thenable}
 */
function selectiOSDistribution () {
	return vscode.window.showQuickPick([ {
		label: 'App Store',
		id: 'dist-appstore'
	},
	{
		label: 'Ad-Hoc',
		id: 'dist-adhoc'
	} ]);
}

async function selectAndroidKeystore (last) {
	const items = [ {
		label: 'Browse ...',
		id: 'browse'
	} ];

	if (last) {
		items.splice(0, 0, {
			label: 'Last used',
			// description: last, FIXME
			id: 'last'
		});
	}

	const keystorePath = await vscode.window.showQuickPick(items, { placeHolder: 'Select Keystore' });
	if (!keystorePath) {
		return;
	}
	if (keystorePath.id === 'browse') {
		const uri = await vscode.window.showOpenDialog({ canSelectFolders: false });
		return uri[0].path;
	} else {
		return last;
	}
}

/**
 * Check Appcelerator login and prompt if necessary.
 * @returns {Boolean} Whether or not the login prompt should be shown.
 */
function checkLoginAndPrompt () {
	if (!appc.isUserLoggedIn()) {
		vscode.window.showInformationMessage('Please log in to the Appcelerator platform');
		runTerminalCommand([ 'login' ]);
		return true;
	}

	return false;
}

/**
 * Open terminal and run command
 *
 * @param {Array} args Array of arguments to be ran.
 */
function runTerminalCommand (args) {
	if (!terminal) {
		terminal = new Terminal({ name: 'Appcelerator' });
	}
	terminal.runCommand({ args });
}

/**
 * Run
 *
 * @param {Object} opts run options
 */
function run (opts) {

	const args = [
		'--platform', opts.platform,
		'--log-level', extensionContext.globalState.get('logLevel', 'info')
	];

	if (project.isTitaniumModule) {
		args.push(
			'--project-dir', opts.platform,
			'--build-only'
		);
	}

	if (opts.buildType === 'run' && project.isTitaniumApp) {

		args.push('--target', opts.target);

		if (opts.target !== 'ws-local') {
			args.push('--device-id', opts.deviceId);
		}

		if (opts.target === 'device' && opts.platform === 'ios') {
			args.push(
				'--developer-name', `"${opts.certificate.name}"`,
				'--pp-uuid', opts.provisioningProfile.uuid
			);
		}

		if (opts.liveview) {
			args.push('--liveview');
		}

	} else if (opts.buildType === 'dist') {
		args.push(
			'--target', opts.target,
			'--output-dir', utils.distributionOutputDirectory()
		);
		if (opts.platform === 'ios') {
			args.push(
				'--distribution-name', `"${opts.certificate.name}"`,
				'--pp-uuid', opts.provisioningProfile.uuid
			);
		} else if (opts.platform === 'android') {
			extensionContext.workspaceState.update('lastKeystorePath', opts.keystore.path);
			args.push(
				'--keystore', opts.keystore.path,
				'--store-password', opts.keystore.password,
				'--alias', opts.keystore.alias
			);
			if (opts.keystore.privateKeyPassword) {
				args.push('--key-password', opts.keystore.privateKeyPassword);
			}
		}
	}

	if (vscode.workspace.getConfiguration('titanium.general').get('useTerminalForBuild')) {
		runTerminalCommand([ 'run', ...args ]);
	} else {
		let message = `Building for ${utils.nameForPlatform(opts.platform)}`;
		if (opts.target) {
			message = `${message} ${utils.nameForTarget(opts.target)}`;
		}
		vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: message }, progress => {

			if (progress) {
				progress.report({ message });
			}

			return new Promise(resolve => {
				appc.run({
					args,
					error: () => {
						resolve();
					},
					exit: () => {
						resolve();
					}
				});
			});
		});
	}
}

/**
 * Generate Alloy and Titanium SDK Completion files
 *
 * @param {Object} opts - Options
 * @param {Object} progress - Progress reporter.
 */
async function generateCompletions ({ force = false, progress = null } = {}) {
	try {
		const sdkVersion = project.sdk()[0];
		if (!sdkVersion) {
			// handle?
		}
		// Generate the completions
		const [ alloy, sdk ] = await Promise.all([
			completionItemProviderHelper.generateAlloyCompletions({ force, progress }),
			completionItemProviderHelper.generateSDKCompletions({ force, progress, sdkVersion })
		]);
		if (sdk || alloy) {
			let message = 'Autocomplete suggestions generated for';
			if (sdk) {
				message = `${message} Titanium ${sdk}`;
			}
			if (alloy) {
				message = `${message} Alloy ${alloy}`;
			}
			vscode.window.showInformationMessage(message);
		}
	} catch (error) {
		vscode.window.showErrorMessage('Error generating autocomplete suggestions');
	}
}
