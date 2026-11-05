import { X509Certificate } from 'crypto';

export interface IOSCertificateMetadata {
	commonName: string;
	teamId?: string;
	organization?: string;
	fingerprint: string;
	expires: number;
}

export interface OrganizationScan {
	organizations: Map<string, Set<string>>;
	skipped: number;
}

/**
 * Reads public certificate metadata independently of the installed ioslib version.
 *
 * @param {string} pem - Public certificate in PEM format
 * @returns {IOSCertificateMetadata | undefined} Parsed metadata, or undefined for unreadable certificates
 */
export function readIOSCertificateMetadata (pem: string): IOSCertificateMetadata | undefined {
	try {
		const certificate = new X509Certificate(pem);
		const subject = certificate.toLegacyObject().subject;
		return {
			commonName: typeof subject.CN === 'string' ? subject.CN : '',
			teamId: typeof subject.OU === 'string' ? subject.OU.trim() : undefined,
			organization: typeof subject.O === 'string' ? subject.O.trim() : undefined,
			fingerprint: certificate.fingerprint256,
			expires: Date.parse(certificate.validTo)
		};
	} catch {
		return undefined;
	}
}

/**
 * Groups usable certificates by their real Team ID, keeping conflicting names for the user to resolve.
 *
 * @param {object[]} certificates - Certificates from every discovered keychain and signing category
 * @param {number} now - Current timestamp, injectable for deterministic expiry checks
 * @returns {OrganizationScan} Unique organization candidates and number of skipped certificates
 */
export function scanIOSOrganizations (certificates: { pem: string; invalid?: boolean | string; expired?: boolean | string }[], now = Date.now()): OrganizationScan {
	const result: OrganizationScan = {
		organizations: new Map(),
		skipped: 0
	};
	const fingerprints = new Set<string>();
	for (const certificate of certificates) {
		const metadata = readIOSCertificateMetadata(certificate.pem);
		if (metadata && fingerprints.has(metadata.fingerprint)) {
			continue;
		}
		if (metadata) {
			fingerprints.add(metadata.fingerprint);
		}
		if (!metadata?.teamId || !metadata.organization || !Number.isFinite(metadata.expires)
			|| metadata.expires <= now || certificate.invalid || certificate.expired) {
			result.skipped++;
			continue;
		}
		const names = result.organizations.get(metadata.teamId) ?? new Set<string>();
		names.add(metadata.organization);
		result.organizations.set(metadata.teamId, names);
	}
	return result;
}

/**
 * Converts legacy settings without spreading a JSON string into numbered character properties.
 *
 * @param {unknown} value - Explicit setting value at one configuration scope
 * @returns {Record<string, string>} Valid organization aliases
 */
export function normalizeIOSOrganizations (value: unknown): Record<string, string> {
	if (value === undefined || value === '') {
		return {};
	}
	if (typeof value === 'string') {
		return normalizeIOSOrganizations(JSON.parse(value));
	}
	if (Array.isArray(value)) {
		const entries: [string, string][] = [];
		for (const item of value) {
			if (!item || typeof item.id !== 'string' || !item.id.trim() || typeof item.name !== 'string' || !item.name.trim()) {
				throw new Error('Invalid legacy iOS organization entry. Correct titanium.ios.organizations in Settings (JSON).');
			}
			entries.push([ item.id, item.name ]);
		}
		return Object.fromEntries(entries);
	}
	if (!value || typeof value !== 'object') {
		throw new Error('Expected an object for titanium.ios.organizations. Correct it in Settings (JSON).');
	}
	const entries = Object.entries(value);
	const characters = entries.filter(([ key, name ]) => /^(0|[1-9]\d*)$/.test(key) && typeof name === 'string' && name.length === 1);
	if (characters.length && characters.some(([ key ]) => key === '0')) {
		characters.sort(([ first ], [ second ]) => Number(first) - Number(second));
		if (characters.every(([ key ], index) => Number(key) === index)) {
			const recovered = normalizeIOSOrganizations(characters.map(([ , character ]) => character).join(''));
			const characterKeys = new Set(characters.map(([ key ]) => key));
			return {
				...recovered,
				...normalizeIOSOrganizations(Object.fromEntries(entries.filter(([ key ]) => !characterKeys.has(key))))
			};
		}
	}
	for (const [ key, name ] of entries) {
		if (!key.trim() || typeof name !== 'string' || !name.trim()) {
			throw new Error('Organization IDs and names must be non-empty strings. Correct titanium.ios.organizations in Settings (JSON).');
		}
	}
	return Object.fromEntries(entries) as Record<string, string>;
}
