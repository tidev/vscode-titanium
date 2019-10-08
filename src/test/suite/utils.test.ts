/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import { describe, it } from 'mocha';

import { IosCertificateType } from '../../types/common';
import { getCorrectCertificateName, iOSProvisioningProfileMatchesAppId } from '../../utils';

describe('iOS provisioning profile matches app ID', () => {

	describe('Wildcard app ID', () => {
		it('should match all', () => {
			expect(iOSProvisioningProfileMatchesAppId('*', 'com.example.app')).to.be.ok;
			expect(iOSProvisioningProfileMatchesAppId('*', 'com.anotherexample.app')).to.be.ok;
		});
	});

	describe('Explicit app ID', () => {
		it('should match case sensitivity', () => {
			expect(iOSProvisioningProfileMatchesAppId('com.example.app', 'com.example.app')).to.be.ok;
			expect(iOSProvisioningProfileMatchesAppId('com.example.app', 'com.Example.App')).not.to.be.ok;
		});
		it('mismatching path components', () => {
			expect(iOSProvisioningProfileMatchesAppId('com.example.app', 'com.example.anotherapp')).not.to.be.ok;
			expect(iOSProvisioningProfileMatchesAppId('com.example.app', 'com.anotherexample.app')).not.to.be.ok;
		});
	});

	describe('Prefixed wildcard app ID', () => {
		it('should match', () => {
			expect(iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.app')).to.be.ok;
			expect(iOSProvisioningProfileMatchesAppId('com.example.*', 'com.anotherexample.app')).not.to.be.ok;
		});

		it('case sensitivity', () => {
			expect(iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.App')).to.be.ok;
			expect(iOSProvisioningProfileMatchesAppId('com.example.*', 'com.Example.app')).not.to.be.ok;
		});
		it('additional path component', () => {
			expect(iOSProvisioningProfileMatchesAppId('com.example.*', 'com.example.example.app')).to.be.ok;
		});
	});

});

describe('#getCorrectCertificateName', () => {

	it('Should return correct name property for <8.2.0', () => {
		const certificate = getCorrectCertificateName('iPhone Developer: Mrs Developer (D4BDS41234)', '8.1.1.GA', IosCertificateType.developer);
		expect(certificate).to.equal('Mrs Developer (D4BDS41234)');
	});

	it('Should return correct name property for >=8.2.0', () => {
		const certificate = getCorrectCertificateName('iPhone Developer: Mrs Developer (D4BDS41234)', '8.2.0.GA', IosCertificateType.developer);
		expect(certificate).to.equal('iPhone Developer: Mrs Developer (D4BDS41234)');
	});
});
