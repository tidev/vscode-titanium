import { expect } from 'chai';
import { before, describe, it } from 'mocha';

import Appc from '../../../appc';
import info from '../fixtures/ti_info';

describe('appc', () => {

	before(() => {
		Appc.info = info;
	});

	describe('SDKs', () => {
		it('should list all SDKs', () => {
			const sdks = Appc.sdks();
			expect(sdks.length).to.equal(7);
			expect(sdks[0].version).to.equal('7.0.0');
			expect(sdks[0].fullversion).to.equal('7.0.0.v20170815160201');
		});

		it('should retrieve the latest SDK', () => {
			expect(Appc.latestSdk(false)?.fullversion).to.equal('7.0.0.v20170815160201');
		});

		it('should list all GA SDKs', () => {
			const sdks = Appc.sdks(true);
			expect(sdks.length).to.equal(2);
			expect(sdks[0].version).to.equal('6.1.2');
			expect(sdks[0].fullversion).to.equal('6.1.2.GA');
		});

		it('should retrieve the latest GA SDK', () => {
			expect(Appc.latestSdk()?.fullversion).to.equal('6.1.2.GA');
		});

		it('should list selected', () => {
			expect(Appc.selectedSdk()?.fullversion).to.equal('6.1.2.GA');
		});

		it('should return sdk info for an sdk', () => {
			expect(Appc.sdkInfo('6.1.2.GA')).to.deep.equal({
				fullversion: '6.1.2.GA',
				version: '6.1.2',
				path: '/Users/user/Library/Application Support/Titanium/mobilesdk/osx/6.1.2.GA',
				platforms: [
					'iphone',
					'android',
					'mobileweb'
				],
				githash: 'c4cd761',
				timestamp: '7/27/2017 23:13',
				nodeAppcVer: '0.2.43'
			});
		});
	});

	describe('devices', () => {
		it('should return iOS sim versions', () => {
			expect(Appc.iOSSimulatorVersions()).to.deep.equal([ '11.0', '10.3' ]);
		});

		it('should return iOS targets', () => {
			const targets = Appc.iOSTargets();

			expect(targets.devices.length).to.equal(2);
			expect(targets.simulators['11.0'].length).to.equal(15);
			expect(targets.simulators['10.3'].length).to.equal(16);
		});

		it('should return Android targets', () => {
			const targets = Appc.androidTargets();

			expect(targets.devices.length).to.equal(1);
			expect(targets.emulators.AVDs.length).to.equal(1);
			expect(targets.emulators.Genymotion.length).to.equal(3);

		});
	});

	describe('iOS certificates', () => {
		it('should list all developer certificates', () => {
			const certificates = Appc.iOSCertificates();
			expect(certificates.length).to.equal(2);
			expect(certificates[0].name).to.equal('Mrs Developer (D4BDS41234)');
		});

		it('should list all distribution certificates', () => {
			const certificates = Appc.iOSCertificates('distribution');
			expect(certificates.length).to.equal(3);
			expect(certificates[0].name).to.equal('Mrs Developer (VNUS781234)');
		});
	});

	describe('iOS provisioning profiles', () => {
		it('development should match certificate', () => {
			const certificate = Appc.iOSCertificates()[0];
			const profiles = Appc.iOSProvisioningProfiles('development', certificate, '');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Appcelerator Development Profile');
			expect(profiles[0].team[0]).to.equal('WOUS58744L');
		});

		it('development should match certificate and app ID', () => {
			const certificate = Appc.iOSCertificates()[0];
			const profiles = Appc.iOSProvisioningProfiles('development', certificate, 'com.appcelerator.test');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Appcelerator Development Profile');
			expect(profiles[0].team[0]).to.equal('WOUS58744L');
		});

		it('development should match certificate and not app ID', () => {
			const certificate = Appc.iOSCertificates()[0];
			const profiles = Appc.iOSProvisioningProfiles('development', certificate, 'com.axway.test');
			expect(profiles.length).to.equal(0);
		});

		it('distribution (adhoc) should match certificate', () => {
			const certificate = Appc.iOSCertificates('distribution')[0];
			const profiles = Appc.iOSProvisioningProfiles('distribution', certificate, '');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Wildcard ad-hoc');
			expect(profiles[0].team[0]).to.equal('WOUS58744L');
		});

		it('distribution (adhoc) should match certificate and app ID', () => {
			const certificate = Appc.iOSCertificates('distribution')[0];
			const profiles = Appc.iOSProvisioningProfiles('distribution', certificate, 'com.appcelerator.test');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Wildcard ad-hoc');
			expect(profiles[0].team[0]).to.equal('WOUS58744L');
		});

		it('distribution (adhoc) development should match certificate and not app ID', () => {
			const certificate = Appc.iOSCertificates('distribution')[1];
			const profiles = Appc.iOSProvisioningProfiles('distribution', certificate, 'com.axway.test');
			expect(profiles.length).to.equal(0);
		});

		it('distribution (appstore) should match certificate', () => {
			const certificate = Appc.iOSCertificates('distribution')[2];
			const profiles = Appc.iOSProvisioningProfiles('appstore', certificate, '');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Example Corp Distribution');
			expect(profiles[0].team[0]).to.equal('YR4982RUKL');
		});

		it('distribution (appstore) should match certificate and app ID', () => {
			const certificate = Appc.iOSCertificates('distribution')[2];
			const profiles = Appc.iOSProvisioningProfiles('appstore', certificate, 'com.excorp.test');

			expect(profiles.length).to.equal(1);
			expect(profiles[0].name).to.equal('Example Corp Distribution');
			expect(profiles[0].team[0]).to.equal('YR4982RUKL');
		});

		it('distribution (appstore) development should match certificate and not app ID', () => {
			const certificate = Appc.iOSCertificates('distribution')[2];
			const profiles = Appc.iOSProvisioningProfiles('appstore', certificate, 'com.axway.test');
			expect(profiles.length).to.equal(0);
		});
	});
});
