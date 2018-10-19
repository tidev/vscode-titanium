const vscode = require('vscode');
const Appc = require('./appc');
const project = require('./project');
const utils = require('./utils');
const related = require('./related');
const viewCompletionItemProvider = require('./providers/viewCompletionItemProvider');
const styleCompletionItemProvider = require('./providers/styleCompletionItemProvider');
const controllerCompletionItemProvider = require('./providers/controllerCompletionItemProvider');
const tiappCompletionItemProvider = require('./providers/tiappCompletionItemProvider');
const viewDefinitionProvider = require('./providers/viewDefinitionProvider');
const styleDefinitionProvider = require('./providers/styleDefinitionProvider');
const controllerDefinitionProvider = require('./providers/controllerDefinitionProvider');
const definitionProviderHelper = require('./providers/definitionProviderHelper');
const completionItemProviderHelper = require('./providers/completionItemProviderHelper');

const openDashboardCommandId = 'appcelerator-titanium.openDashboard';

let extensionContext = {};
let projectStatusBarItem;
let terminal;

/**
 * Activate
 *
 * @param {Object} context 	extension context
 */
function activate(context) {
	extensionContext = context;
	project.load();
	setStatusBar();
	project.onModified(setStatusBar);

	definitionProviderHelper.activate(context.subscriptions);

	const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
	const styleFilePattern = '**/*.tss';
	const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';
	context.subscriptions.push(
		// register completion providers
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: viewFilePattern }, viewCompletionItemProvider),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: styleFilePattern }, styleCompletionItemProvider),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: controllerFilePattern }, controllerCompletionItemProvider, '.'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: '**/tiapp.xml' }, tiappCompletionItemProvider),

		// register hover providers
		vscode.languages.registerHoverProvider({ scheme: 'file', pattern: '**/{*.xml,*.tss,*.js}' }, definitionProviderHelper),

		// register definition providers
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: viewFilePattern }, viewDefinitionProvider),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: styleFilePattern }, styleDefinitionProvider),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: controllerFilePattern }, controllerDefinitionProvider),

		// register code action providers
		vscode.languages.registerCodeActionsProvider({ scheme: 'file', pattern: viewFilePattern }, viewDefinitionProvider),

		// register init command
		vscode.commands.registerCommand('appcelerator-titanium.init', () => {
			init();
		}),

		// register run command
		vscode.commands.registerCommand('appcelerator-titanium.run', async () => {

			if (checkLoginAndPrompt()) {
				return;
			}

			if (Appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			const runOptions = {
				buildType: 'run'
			};

			let last;
			const lastOptions = extensionContext.workspaceState.get('lastRunOptions');

			if (lastOptions) {
				last = {
					label: 'Last run',
					description: lastRunDescription(lastOptions)
				};
			}

			const platform = await selectPlatform(last);

			if (!platform) {
				return;
			}

			if (platform.id === 'last') {
				run(lastOptions);
				return;
			}

			runOptions.platform = platform.id;

			if (project.isTitaniumModule) {
				run(runOptions);
				return;
			}

			const target = await selectTarget(platform.id);

			if (!target) {
				return;
			}

			runOptions.target = target.id;

			let deviceId;
			if (platform.id === 'ios') {
				if (target.id === 'simulator') {
					deviceId = await selectiOSSimulator();
				} else if (target.id === 'device') {
					deviceId = await selectiOSDevice();
				}
			} else if (runOptions.platform === 'android') {
				if (target.id === 'emulator') {
					deviceId = await selectAndroidEmulator();
				} else if (target.id === 'device') {
					deviceId = await selectAndroidDevice();
				}
			}

			if (!deviceId) {
				return;
			}

			runOptions.deviceId = deviceId.udid;
			runOptions.deviceLabel = deviceId.label;
			if (platform.id === 'ios' && target.id === 'device') {
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
		vscode.commands.registerCommand('appcelerator-titanium.dist', async () => {
			if (checkLoginAndPrompt()) {
				return;
			}

			if (Appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			if (project.isTitaniumModule) {
				vscode.window.showErrorMessage('Use run command to build native module');
				return;
			}

			const runOptions = {
				buildType: 'dist'
			};

			let last;
			const lastOptions = extensionContext.workspaceState.get('lastDistOptions');
			if (lastOptions) {
				last = {
					label: 'Last build',
					description: lastDistDescription(lastOptions)
				};
			}

			const platform = await selectPlatform(last);
			if (!platform) {
				return;
			}
			if (platform.id === 'last') {
				run(lastOptions);
				return;
			}
			runOptions.platform = platform.id;

			if (platform.id === 'ios') {
				const target = await selectiOSDistribution();
				if (!target) {
					return;
				}
				runOptions.target = target.id;
				const profile = await selectiOSCodeSigning(runOptions);
				if (!profile) {
					return;
				}
				runOptions.provisioningProfile = profile;
			} else if (platform.id === 'android') {
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
		vscode.commands.registerCommand('appcelerator-titanium.stop', () => {
			if (vscode.workspace.getConfiguration('appcelerator-titanium.general').get('useTerminalForBuild')) {
				if (terminal) {
					runTerminalCommand('\x03');
				}
			} else {
				Appc.stop();
			}
		}),

		// register set log level command
		vscode.commands.registerCommand('appcelerator-titanium.set-log-level', () => {
			vscode.window.showQuickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], { placeHolder: 'Select log level' }).then(level => {
				if (level) {
					extensionContext.globalState.update('logLevel', level.toLowerCase());
				}
			});
		}),

		// register related view commands
		vscode.commands.registerCommand('appcelerator-titanium.open-related-view', () => {
			related.openRelatedFile('xml');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-style', () => {
			related.openRelatedFile('tss');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-controller', () => {
			related.openRelatedFile('js');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.toggle-related-files', () => {
			related.openAllFiles();
		}),

		// register generate autocomplete suggestions command
		vscode.commands.registerCommand('appcelerator-titanium.generate-autocomplete-suggestions', () => {
			vscode.workspace.getConfiguration('appcelerator-titanium.general').update('generateAutoCompleteSuggestions', true, true).then(() => {
				completionItemProviderHelper.generateCompletions(null, (success) => {
					if (success) {
						delete require.cache[require.resolve('./providers/completions')];
						viewCompletionItemProvider.loadCompletions();
						styleCompletionItemProvider.loadCompletions();
						controllerCompletionItemProvider.loadCompletions();
					}
				});

			});
		}),

		vscode.commands.registerCommand(openDashboardCommandId, () => {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(project.dashboardUrl()));
		})
	);

	init();
}
exports.activate = activate; // eslint-disable-line no-undef

/**
 * Deactivate
*/
function deactivate() {
	project.dispose();
}
exports.deactivate = deactivate;  // eslint-disable-line no-undef

/**
 * Initialise extension - fetch appc info
*/
function init() {
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, p => {
		return new Promise((resolve, reject) => {
			Appc.getInfo((info) => {
				if (info) {
					completionItemProviderHelper.generateCompletions(p, (success) => {
						if (success) {
							resolve();
						} else {
							vscode.window.showErrorMessage('Error fetching Appcelerator environment');
							reject();
						}
					});
				} else {
					vscode.window.showErrorMessage('Error fetching Appcelerator environment');
					reject();
				}
			});
		});
	});
}

/**
 * Set project name and link to dashboard in status bar
 */
function setStatusBar() {
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
function selectPlatform(platforms, last) {
	if (platforms && !Array.isArray(platforms)) {
		last = platforms;
		platforms = null;
	}
	if (!platforms) {
		platforms = utils.platforms();
	}
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
			description: last.description,
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
function lastRunDescription(opts) {
	return `${utils.nameForPlatform(opts.platform)} ${utils.nameForTarget(opts.target)} ${opts.deviceLabel}`;
}

/**
 * Returns description for last distribution build
 *
 * @param {Object} opts run options
 * @returns {String} The description for the last distribution build
 */
function lastDistDescription(opts) {
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
function selectTarget(platform) {
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
 * @returns {Thenable}
*/
function selectiOSSimulator() {
	if (!Appc.iOSSimulators() || Appc.iOSSimulators() === {}) {
		vscode.workspace.showErrorMessage('Error fetching iOS simulators. Check your environment and run `Appcelerator: init`.');
		return;
	}
	return vscode.window.showQuickPick(Object.keys(Appc.iOSSimulators()), { placeHolder: 'Select iOS version' }).then(version => {
		const simulators = Appc.iOSSimulators()[version].map(simulator => {
			return {
				udid: simulator.udid,
				label: `${simulator.name} (${version})`,
				version: version
			};
		});
		return vscode.window.showQuickPick(simulators, { placeHolder: 'Select simulator' });
	});
}

/**
 * Select iOS device
 *
 * @returns {Thenable}
*/
function selectiOSDevice() {
	const devices = Appc.iOSDevices().map(device => {
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
async function selectiOSCodeSigning({ buildType, target }) {
	const selectedCertificate = await selectiOSCertificate(buildType);
	if (!selectedCertificate) {
		return;
	}

	const certificate = Appc.iOSCertificates(buildType === 'run' ? 'developer' : 'distribution').find(cert => cert.pem === selectedCertificate.pem);

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
function selectiOSCertificate(buildType) {
	const certificates = Appc.iOSCertificates(buildType === 'run' ? 'developer' : 'distribution').map(certificate => {
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
function selectiOSProvisioningProfile({ certificate, target }) {
	const profiles = [];
	let deployment = 'development';
	if (target === 'dist-adhoc') {
		deployment = 'distribution';
	} else if (target === 'dist-appstore') {
		deployment = 'appstore';
	}
	Appc.iOSProvisioningProfiles(deployment, certificate, project.appId()).forEach(profile => {
		if (!profile.disabled) {
			const item = {
				label: profile.name,
				description: profile.uuid,
				uuid: profile.uuid
			};
			if (vscode.workspace.getConfiguration('appcelerator-titanium.iOS').get('showProvisioningProfileDetail')) {
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
function selectAndroidEmulator() {
	const emulators = Appc.androidEmulators();
	let options = [];
	if (emulators.AVDs.length > 0) {
		emulators.AVDs.forEach(emulator => {
			options.push({
				udid: emulator.id,
				label: emulator.name
			});
		});
	}
	if (emulators.Genymotion.length > 0) {
		emulators.Genymotion.forEach(emulator => {
			options.push({
				udid: emulator.id,
				label: emulator.name
			});
		});
	}

	if (!emulators.length) {
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
function selectAndroidDevice() {
	const devices = Appc.androidDevices().map(device => {
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
function selectiOSDistribution() {
	return vscode.window.showQuickPick([ {
		label: 'App Store',
		id: 'dist-appstore'
	},
	{
		label: 'Ad-Hoc',
		id: 'dist-adhoc'
	} ]);
}

async function selectAndroidKeystore(last) {
	const items = [ {
		label: 'Browse ...',
		id: 'browse'
	} ];

	if (last) {
		items.splice(0, 0, {
			label: 'Last used',
			description: last,
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
function checkLoginAndPrompt() {
	if (!Appc.isUserLoggedIn()) {
		vscode.window.showInformationMessage('Please log in to the Appcelerator platform');
		runTerminalCommand(`${vscode.workspace.getConfiguration('appcelerator-titanium.general').get('appcCommandPath')} login`);
		return true;
	}

	return false;
}

/**
 * Open terminal and run command
 *
 * @param {String} cmd command to run
 */
function runTerminalCommand(cmd) {
	if (!terminal) {
		terminal = vscode.window.createTerminal('Appcelerator');
	} else {
		terminal.sendText('\x03');
	}
	terminal.show();
	terminal.sendText('clear');
	terminal.sendText(cmd);
}

/**
 * Run
 *
 * @param {Object} opts run options
 */
function run(opts) {

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

		args.push(
			'--target', opts.target,
			'--device-id', opts.deviceId
		);

		if (opts.target === 'device' && opts.platform === 'ios') {
			args.push(
				'--developer-name', opts.certificate.name,
				'--pp-uuid', opts.provisioningProfile.uuid
			);
		}

	} else if (opts.buildType === 'dist') {
		args.push(
			'--target', opts.target,
			'--output-dir', utils.distributionOutputDirectory()
		);
		if (opts.platform.id === 'ios') {
			args.push(
				'--distribution-name', opts.certificate.name,
				'--pp-uuid', opts.provisioningProfile.uuid
			);
		} else if (opts.platform.id === 'android') {
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

	if (vscode.workspace.getConfiguration('appcelerator-titanium.general').get('useTerminalForBuild')) {
		const cmd = vscode.workspace.getConfiguration('appcelerator-titanium.general').get('appcCommandPath');
		runTerminalCommand(`${cmd} run ${args.join(' ')}`);
	} else {
		let message = `Building for ${utils.nameForPlatform(opts.platform)}`;
		if (opts.target) {
			message = `${message} ${utils.nameForTarget(opts.target)}`;
		}
		vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: message }, progress => {
			progress && progress.report(message);

			return new Promise((resolve) => {
				Appc.run({
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
