import { strict as assert } from 'assert';
import { getIOSCertificateLabel } from '../../../quickpicks/build/iosOrganizations';

describe('iOS certificate organization labels', () => {
	it('labels matching certificates without leaking names to subsequent certificates', () => {
		const organizations = {
			TZF9D6738F: 'First organization',
			'73QRFU8MDC': 'Second organization'
		};
		const labels = [
			'Mrs Developer (TZF9D6738F)',
			'Mr Developer (UNKNOWN123)',
			'Another Developer (73QRFU8MDC)'
		].map(name => getIOSCertificateLabel(name, organizations));

		assert.deepEqual(labels, [
			'Mrs Developer (TZF9D6738F) → First organization',
			'Mr Developer (UNKNOWN123)',
			'Another Developer (73QRFU8MDC) → Second organization'
		]);
	});

	it('preserves names when settings are empty or invalid', () => {
		const name = 'Mrs Developer (TZF9D6738F)';
		const settings = [
			{},
			undefined,
			null,
			42,
			'',
			[],
			{
				TZF9D6738F: 42
			},
			{
				TZF9D6738F: '   '
			}
		];

		for (const organizations of settings) {
			assert.equal(getIOSCertificateLabel(name, organizations), name);
		}
	});

	it('handles missing or malformed organization IDs safely', () => {
		const organizations = {
			TZF9D6738F: 'First organization'
		};
		for (const name of [ '', 'Developer', 'Developer (', 'Developer ()', 'Developer (TZF9D6738F' ]) {
			assert.equal(getIOSCertificateLabel(name, organizations), name);
		}
		assert.equal(getIOSCertificateLabel('Developer (Client) (TZF9D6738F)', organizations),
			'Developer (Client) (TZF9D6738F) → First organization');
	});

	it('ignores inherited entries and reads updated names on the next call', () => {
		const name = 'Developer (TZF9D6738F)';
		assert.equal(getIOSCertificateLabel('Developer (toString)', {}), 'Developer (toString)');
		assert.equal(getIOSCertificateLabel(name, {
			TZF9D6738F: 'First name'
		}), `${name} → First name`);
		assert.equal(getIOSCertificateLabel(name, {
			TZF9D6738F: 'Updated name'
		}), `${name} → Updated name`);
	});
});
