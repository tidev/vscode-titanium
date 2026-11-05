import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { scanCertificates } from '../../../commands/scanCertificates';
import { migrateIOSOrganizationSettings } from '../../../iosOrganizationSettings';
import type { IosCert } from '../../../types/common';

describe('certificate organization import', () => {
	const sandbox = sinon.createSandbox();
	const setting = 'titanium.ios.organizations';
	let globalValue: unknown;
	let workspaceValue: unknown;
	let updates: { value: unknown; target: unknown }[];
	let messages: sinon.SinonStub;
	let errors: sinon.SinonStub;
	let pick: sinon.SinonStub;

	const certificate = (name: string): IosCert => ({
		pem: readFileSync(path.resolve(__dirname, '../../../../src/test/common/fixtures/ios-certificates', `${name}.pem`), 'utf8'),
		name: 'Test Developer (LEGACY1234)',
		fullname: 'Apple Development: Test Developer (LEGACY1234)',
		after: '2035-01-01',
		before: '2020-01-01',
		expired: false,
		invalid: false
	});

	beforeEach(() => {
		globalValue = undefined;
		workspaceValue = undefined;
		updates = [];
		const config = {
			get: () => workspaceValue ?? globalValue ?? {},
			inspect: () => ({
				globalValue,
				workspaceValue
			}),
			update: async (key: string, value: unknown, target: unknown) => {
				assert.equal(key, setting);
				updates.push({
					value,
					target
				});
				if (target === vscode.ConfigurationTarget.Global) {
					globalValue = value;
				} else {
					workspaceValue = value;
				}
			}
		};
		sandbox.stub(vscode.workspace, 'getConfiguration').returns(config as unknown as vscode.WorkspaceConfiguration);
		sandbox.stub(vscode.workspace, 'isTrusted').value(true);
		sandbox.stub(vscode.window, 'withProgress').callsFake(async (_options, task) => task({
			report() {
				// Progress reporting is not needed for these command tests.
			}
		}, new vscode.CancellationTokenSource().token));
		const destination = {
			label: 'User settings',
			target: vscode.ConfigurationTarget.Global
		};
		pick = sandbox.stub(vscode.window, 'showQuickPick').resolves(destination);
		messages = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
		errors = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
		sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('imports once to User settings and keeps manual names on repeated scans', async function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		globalValue = {
			LEGACY1234: 'My client'
		};
		const load = async () => [ certificate('development'), certificate('legacy-development') ];
		await scanCertificates(load);
		assert.deepEqual(globalValue, {
			LEGACY1234: 'My client',
			TEAM123456: 'Test Company'
		});
		assert.equal(updates[0].target, vscode.ConfigurationTarget.Global);
		await scanCertificates(load);
		assert.equal(updates.length, 1);
		assert.equal(errors.callCount, 0);
		assert.ok(messages.calledWithMatch('added 0 organizations; kept 1'));
	});

	it('writes only the selected workspace scope and preserves names edited during the scan', async function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		globalValue = {
			LEGACY1234: 'User alias'
		};
		pick.resolves({
			target: vscode.ConfigurationTarget.Workspace
		});
		await scanCertificates(async () => {
			workspaceValue = {
				TEAM123456: 'New manual name'
			};
			return [ certificate('development') ];
		});
		assert.equal(updates.length, 0);
		assert.deepEqual(workspaceValue, {
			TEAM123456: 'New manual name'
		});
	});

	it('allows resolving conflicting certificate names before importing', async function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		pick.onSecondCall().resolves('Other Company');
		await scanCertificates(async () => [ certificate('development'), certificate('conflicting-name') ]);
		assert.deepEqual(globalValue, {
			TEAM123456: 'Other Company'
		});
	});

	it('adds missing teams to Workspace settings without copying User entries', async function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		globalValue = {
			LEGACY1234: 'User alias'
		};
		pick.resolves({
			target: vscode.ConfigurationTarget.Workspace
		});
		await scanCertificates(async () => [ certificate('development') ]);
		assert.deepEqual(updates, [ {
			value: {
				TEAM123456: 'Test Company'
			},
			target: vscode.ConfigurationTarget.Workspace
		} ]);
		assert.deepEqual(globalValue, {
			LEGACY1234: 'User alias'
		});
	});

	it('preserves a manual alias added while resolving conflicting names', async function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		pick.onSecondCall().callsFake(async () => {
			globalValue = {
				TEAM123456: 'Just edited'
			};
			return 'Other Company';
		});
		await scanCertificates(async () => [ certificate('development'), certificate('conflicting-name') ]);
		assert.equal(updates.length, 0);
		assert.deepEqual(globalValue, {
			TEAM123456: 'Just edited'
		});
	});

	it('does not write after cancellation or a scan error, and allows retrying', async function () {
		if (process.platform !== 'darwin') {
			this.skip();
		}
		const load = sandbox.stub().resolves([ certificate('development') ]);
		pick.onFirstCall().resolves(undefined);
		await scanCertificates(load);
		assert.equal(load.callCount, 0);
		await scanCertificates(async () => {
			throw new Error('CLI failed');
		});
		assert.equal(updates.length, 0);
		assert.equal(errors.callCount, 1);
		await scanCertificates(load);
		assert.equal(updates.length, 1);
	});

	it('converts legacy strings at their original scopes before Settings is edited', async () => {
		globalValue = '[{"id":"LEGACY1234","name":"User client"}]';
		workspaceValue = '[{"id":"TEAM123456","name":"Workspace client"}]';
		await migrateIOSOrganizationSettings();
		assert.deepEqual(updates, [
			{
				value: {
					LEGACY1234: 'User client'
				},
				target: vscode.ConfigurationTarget.Global
			},
			{
				value: {
					TEAM123456: 'Workspace client'
				},
				target: vscode.ConfigurationTarget.Workspace
			}
		]);
	});

	it('leaves invalid legacy settings untouched', async () => {
		globalValue = 'broken JSON';
		await migrateIOSOrganizationSettings();
		assert.equal(updates.length, 0);
		assert.equal(globalValue, 'broken JSON');
	});
});
