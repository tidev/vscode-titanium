import { expect } from 'chai';
import { describe, it } from 'mocha';

import Appc from '../../appc';
import { IosCertificateType } from '../../types/common';
import info from './fixtures/data/ti_info';

Appc.info = info;

describe('SDKs', () => {

	describe('All SDKs', () => {
		it('should list all SDKs', () => {
			const sdks = Appc.sdks();
			expect(sdks.length).to.equal(7);
			expect(sdks[0].version).to.equal('7.0.0');
			expect(sdks[0].fullversion).to.equal('7.0.0.v20170815160201');
		});

		it('should retrieve the latest SDK', () => {
			expect(Appc.latestSdk(false)!.fullversion).to.equal('7.0.0.v20170815160201');
		});
	});

	describe('GA SDKs', () => {
		it('should list all GA SDKs', () => {
			const sdks = Appc.sdks(true);
			expect(sdks.length).to.equal(2);
			expect(sdks[0].version).to.equal('6.1.2');
			expect(sdks[0].fullversion).to.equal('6.1.2.GA');
		});

		it('should retrieve the latest GA SDK', () => {
			expect(Appc.latestSdk()!.fullversion).to.equal('6.1.2.GA');
		});
	});

});

describe('iOS certificates', () => {

	it('should list all developer certificates', () => {
		const certificates = Appc.iOSCertificates();
		expect(certificates.length).to.equal(2);
		expect(certificates[0].name).to.equal('Mrs Developer (D4BDS41234)');
	});

	it('should list all distribution certificates', () => {
		const certificates = Appc.iOSCertificates(IosCertificateType.distribution);
		expect(certificates.length).to.equal(3);
		expect(certificates[0].name).to.equal('Mrs Developer (VNUS781234)');
	});

});

describe('iOS provisioning profiles', () => {

	describe('Development profiles', () => {

		it('should match certificate', () => {
			const certificate = Appc.iOSCertificates()[0];
			const profiles = Appc.iOSProvisioningProfiles('development', certificate, '');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Appcelerator Development Profile');
			expect(profiles[0].team[0]).to.equal('WOUS58744L');
		});

		it('should match certificate and app ID', () => {
			const certificate = Appc.iOSCertificates()[0];
			const profiles = Appc.iOSProvisioningProfiles('development', certificate, 'com.appcelerator.test');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Appcelerator Development Profile');
			expect(profiles[0].team[0]).to.equal('WOUS58744L');
		});

		it('should match certificate and not app ID', () => {
			const certificate = Appc.iOSCertificates()[0];
			const profiles = Appc.iOSProvisioningProfiles('development', certificate, 'com.axway.test');
			expect(profiles.length).to.equal(0);
		});

	});

});
