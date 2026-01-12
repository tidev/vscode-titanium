import * as path from 'path';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';

import * as utils from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../test/common/utils';
import info from '../fixtures/ti_info';
import { ExtensionContainer } from '../../../container';
import { Environment } from '../../../environment-info';
import * as sinon from 'sinon';

describe('utils', () => {
	const sandbox = sinon.createSandbox();

	beforeEach(() => {
		const environment = new Environment();
		environment.info = info;
		sandbox.stub(ExtensionContainer, 'environment').get(() => environment);
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('iOS provisioning profile matches app ID', () => {
		it('Wildcard app ID should match all', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('*', 'com.example.app')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('*', 'com.anotherexample.app')).to.equal(true);
		});

		it('Explicit app ID should match case sensitivity', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.example.app')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.Example.App')).to.equal(false);
		});
		it('Explicit app ID mismatching path components', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.example.anotherapp')).to.equal(false);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.anotherexample.app')).to.equal(false);
		});

		it('Prefixed wildcard app ID should match', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.app')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.anotherexample.app')).to.equal(false);
		});

		it('Prefixed wildcard app ID case sensitivity', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.App')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.Example.app')).to.equal(false);
		});

		it('Prefixed wildcard app ID additional path component', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.example.app')).to.equal(true);
		});
	});

	it('findProjectDirectory', async () => {
		const file = path.join(getCommonAlloyProjectDirectory(), 'app', 'controllers', 'sample.js');
		const dir = await utils.findProjectDirectory(file);
		expect(dir).to.equal(getCommonAlloyProjectDirectory());
	});

	it('normalisedPlatform', () => {
		expect(utils.normalisedPlatform('ipad')).to.equal('ios');
		expect(utils.normalisedPlatform('iphone')).to.equal('ios');
		expect(utils.normalisedPlatform('ios')).to.equal('ios');
		expect(utils.normalisedPlatform('android')).to.equal('android');
	});

	it('nameForPlatform', () => {
		expect(utils.nameForPlatform('ios')).to.equal('iOS');
		expect(utils.nameForPlatform('android')).to.equal('Android');
	});

	it('nameForTarget', () => {
		expect(utils.nameForTarget('device')).to.equal('Device');
		expect(utils.nameForTarget('emulator')).to.equal('Emulator');
		expect(utils.nameForTarget('simulator')).to.equal('Simulator');
		expect(utils.nameForTarget('macos')).to.equal('macOS');
		expect(utils.nameForTarget('dist-adhoc')).to.equal('Ad-Hoc');
		expect(utils.nameForTarget('dist-appstore')).to.equal('App Store');
		expect(utils.nameForTarget('dist-playstore')).to.equal('Play Store');
		expect(utils.nameForTarget('dist-macappstore')).to.equal('macOS App Store');
	});

	it('targetForName', () => {
		expect(utils.targetForName('Device')).to.equal('device');
		expect(utils.targetForName('Emulator')).to.equal('emulator');
		expect(utils.targetForName('Simulator')).to.equal('simulator');
		expect(utils.targetForName('macOS')).to.equal('macos');
		expect(utils.targetForName('Ad-Hoc')).to.equal('dist-adhoc');
		expect(utils.targetForName('App Store')).to.equal('dist-appstore');
		expect(utils.targetForName('Play Store')).to.equal('dist-playstore');
		expect(utils.targetForName('macOS App Store')).to.equal('dist-macappstore');
	});

	it('targetsForPlatform', () => {
		expect(utils.targetsForPlatform('android')).to.deep.equal([ 'emulator', 'device', 'dist-playstore' ]);
		expect(utils.targetsForPlatform('ios')).to.deep.equal([ 'simulator', 'device', 'macos', 'dist-adhoc', 'dist-appstore', 'dist-macappstore' ]);
	});

	it('should be able to retrieve a device name', () => {
		expect(utils.getDeviceNameFromId('abcdefgh', 'android', 'device')).to.equal('HD1903');
		expect(utils.getDeviceNameFromId('Nexus_5X_API_25_x86', 'android', 'emulator')).to.equal('Nexus 5X API 25 x86');

		expect(utils.getDeviceNameFromId('034fdd80e5f4abd9a23db3640b694eb8bb1aab61', 'ios', 'device')).to.equal('Appcelerator iPad Air 2');
		expect(utils.getDeviceNameFromId('9191DC9E-3B91-4BA9-9410-E85E86018E93', 'ios', 'simulator')).to.equal('iPhone 6s (11.0)');

		expect(() => {
			utils.getDeviceNameFromId('foo', 'android', 'device');
		}).to.throw('Unable to find a name for foo');
	});
});
