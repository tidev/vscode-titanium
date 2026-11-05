import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import * as path from 'path';
import { normalizeIOSOrganizations, readIOSCertificateMetadata, scanIOSOrganizations } from '../../../common/iosCertificates';
import { createIOSCertificateChoices, getIOSCertificateLabel } from '../../../quickpicks/build/iosOrganizations';
import type { IosCert } from '../../../types/common';

const fixture = (name: string): string => readFileSync(path.resolve(__dirname, '../../../../src/test/common/fixtures/ios-certificates', `${name}.pem`), 'utf8');

describe('iOS certificate metadata', () => {
	it('reads the actual team from OU instead of the different ID in CN', () => {
		const metadata = readIOSCertificateMetadata(fixture('development'));
		assert.equal(metadata?.teamId, 'TEAM123456');
		assert.equal(metadata?.organization, 'Test Company');
		assert.equal(metadata?.commonName, 'Apple Development: Test Developer (LEGACY1234)');
		assert.ok(metadata?.fingerprint);
		assert.equal(readIOSCertificateMetadata('unreadable'), undefined);
	});

	it('groups distinct certificates by team and deduplicates copies across keychains', () => {
		const pem = fixture('development');
		const result = scanIOSOrganizations([
			{ pem },
			{ pem },
			{ pem: fixture('legacy-development') }
		], 0);
		assert.deepEqual([ ...result.organizations.entries() ].map(([ id, names ]) => [ id, [ ...names ] ]), [ [ 'TEAM123456', [ 'Test Company' ] ] ]);
		assert.equal(result.skipped, 0);
	});

	it('retains conflicting names and skips malformed, expired, invalid, and incomplete certificates', () => {
		const pem = fixture('development');
		const result = scanIOSOrganizations([
			{ pem },
			{ pem: fixture('conflicting-name') },
			{ pem: 'bad PEM' },
			{ pem: fixture('missing-organization') },
			{ pem: fixture('legacy-development'), invalid: true }
		], 0);
		assert.deepEqual([ ...result.organizations.get('TEAM123456') ?? [] ], [ 'Test Company', 'Other Company' ]);
		assert.equal(result.skipped, 3);
		assert.equal(scanIOSOrganizations([ { pem } ], Number.MAX_SAFE_INTEGER).skipped, 1);
	});

	it('prefers manual certificate aliases, then team aliases, then the detected organization', () => {
		const metadata = readIOSCertificateMetadata(fixture('development'));
		const name = metadata?.commonName ?? '';
		assert.equal(getIOSCertificateLabel(name, {
			LEGACY1234: 'My client',
			TEAM123456: 'Team alias'
		}, metadata), `${name} → My client`);
		assert.equal(getIOSCertificateLabel(name, {
			TEAM123456: 'Team alias'
		}, metadata), `${name} → Team alias`);
		assert.equal(getIOSCertificateLabel(name, {}, metadata), `${name} → Test Company`);
	});

	it('shows actual certificate types and fingerprints while collapsing only identical copies', () => {
		const certificate = (name: string): IosCert => ({
			pem: fixture(name),
			name: 'Test Developer (LEGACY1234)',
			fullname: 'Fallback name',
			after: '2030-01-01',
			before: '2020-01-01',
			expired: false,
			invalid: false
		});
		const first = certificate('development');
		const choices = createIOSCertificateChoices([ first, first, certificate('legacy-development') ], {});
		assert.equal(choices.length, 2);
		assert.ok(choices[0].label.startsWith('Apple Development:'));
		assert.ok(choices[1].label.startsWith('iPhone Developer:'));
		assert.match(choices[0].detail, /Team: TEAM123456 · Fingerprint: [A-F0-9]{12}/);
		assert.notEqual(choices[0].id, choices[1].id);
		assert.equal(choices[0].pem, first.pem);
	});
});

describe('legacy iOS organization settings', () => {
	const legacy = '[{"id":"LEGACY1234","name":"My client"}]';

	it('converts string arrays and already parsed arrays without losing names', () => {
		assert.deepEqual(normalizeIOSOrganizations(legacy), {
			LEGACY1234: 'My client'
		});
		assert.deepEqual(normalizeIOSOrganizations(JSON.parse(legacy)), normalizeIOSOrganizations(legacy));
		assert.deepEqual(normalizeIOSOrganizations(''), {});
	});

	it('recovers numbered character entries and preserves manually added aliases', () => {
		const broken = {
			...Object.fromEntries([ ...legacy ].map((character, index) => [ String(index), character ])),
			TEAM123456: 'Team alias'
		};
		assert.deepEqual(normalizeIOSOrganizations(broken), {
			LEGACY1234: 'My client',
			TEAM123456: 'Team alias'
		});
	});

	it('rejects corrupt input rather than discarding entries during migration', () => {
		assert.throws(() => normalizeIOSOrganizations('broken JSON'));
		assert.throws(() => normalizeIOSOrganizations('[{"id":"missing-name"}]'));
		assert.throws(() => normalizeIOSOrganizations({
			TEAM123456: 42
		}));
	});
});
