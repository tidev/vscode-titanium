import * as path from 'path';
import { expect } from 'chai';
import { describe, it } from 'mocha';

import * as utils from '../../../utils';
import { getCommonAlloyProjectDirectory } from '../../../test/common/utils';

describe('iOS provisioning profile matches app ID', () => {

	describe('Wildcard app ID', () => {
		it('should match all', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('*', 'com.example.app')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('*', 'com.anotherexample.app')).to.equal(true);
		});
	});

	describe('Explicit app ID', () => {
		it('should match case sensitivity', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.example.app')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.Example.App')).to.equal(false);
		});
		it('mismatching path components', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.example.anotherapp')).to.equal(false);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.app', 'com.anotherexample.app')).to.equal(false);
		});
	});

	describe('Prefixed wildcard app ID', () => {
		it('should match', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.app')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.anotherexample.app')).to.equal(false);
		});

		it('case sensitivity', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.App')).to.equal(true);
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.Example.app')).to.equal(false);
		});
		it('additional path component', () => {
			expect(utils.iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.example.app')).to.equal(true);
		});
	});

});

describe('#getCorrectCertificateName', () => {

	it('Should return correct name property for <8.2.0', () => {
		const certificate = utils.getCorrectCertificateName('iPhone Developer: Mrs Developer (D4BDS41234)', '8.1.1.GA', 'developer');
		expect(certificate).to.equal('Mrs Developer (D4BDS41234)');
	});

	it('Should return correct name property for >=8.2.0', () => {
		const certificate = utils.getCorrectCertificateName('iPhone Developer: Mrs Developer (D4BDS41234)', '8.2.0.GA', 'developer');
		expect(certificate).to.equal('iPhone Developer: Mrs Developer (D4BDS41234)');
	});
});

describe('utils', () => {

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
		expect(utils.nameForTarget('dist-adhoc')).to.equal('Ad-Hoc');
		expect(utils.nameForTarget('dist-appstore')).to.equal('App Store');
		expect(utils.nameForTarget('dist-playstore')).to.equal('Play Store');
	});

	it('targetForName', () => {
		expect(utils.targetForName('Device')).to.equal('device');
		expect(utils.targetForName('Emulator')).to.equal('emulator');
		expect(utils.targetForName('Simulator')).to.equal('simulator');
		expect(utils.targetForName('Ad-Hoc')).to.equal('dist-adhoc');
		expect(utils.targetForName('App Store')).to.equal('dist-appstore');
		expect(utils.targetForName('Play Store')).to.equal('dist-playstore');
	});

	it('targetsForPlatform', () => {
		expect(utils.targetsForPlatform('android')).to.deep.equal([ 'emulator', 'device', 'dist-playstore' ]);
		expect(utils.targetsForPlatform('ios')).to.deep.equal([ 'simulator', 'device', 'dist-adhoc', 'dist-appstore' ]);
	});
});
