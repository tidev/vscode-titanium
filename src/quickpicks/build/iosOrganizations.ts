/**
 * Adds a configured organization name without allowing invalid settings to block selection.
 *
 * @param {string} name - Certificate name supplied by the Titanium CLI
 * @param {unknown} organizations - Organization ID to display name mapping from settings
 * @param {IOSCertificateMetadata} metadata - Certificate subject metadata, when available
 * @returns {string} Certificate label, including its organization when configured
 */
export function getIOSCertificateLabel (name: string, organizations: unknown, metadata?: IOSCertificateMetadata): string {
	const organizationId = /\(([^()]+)\)\s*$/.exec(name)?.[1];
	let aliases: Record<string, string> = {};
	try {
		aliases = normalizeIOSOrganizations(organizations);
	} catch {
		// An invalid user setting must not prevent choosing a signing certificate.
	}
	for (const id of [ organizationId, metadata?.teamId ]) {
		if (id && Object.prototype.hasOwnProperty.call(aliases, id)) {
			return `${name} → ${aliases[id].trim()}`;
		}
	}
	return metadata?.organization ? `${name} → ${metadata.organization}` : name;
}

/**
 * Keeps actual signing identities separate while collapsing copies in multiple keychains.
 *
 * @param {IosCert[]} certificates - Certificates in the requested build category
 * @param {unknown} organizations - User-defined certificate and team aliases
 * @returns {object[]} Picker items retaining the PEM used to resolve the selected certificate
 */
export function createIOSCertificateChoices (certificates: IosCert[], organizations: unknown): { label: string; description: string; detail: string; id: string; pem: string }[] {
	const seen = new Set<string>();
	const choices = [];
	for (const certificate of certificates) {
		const metadata = readIOSCertificateMetadata(certificate.pem);
		const identity = metadata?.fingerprint ?? certificate.pem;
		if (identity && seen.has(identity)) {
			continue;
		}
		seen.add(identity);
		const details = [];
		if (metadata?.teamId) {
			details.push(`Team: ${metadata.teamId}`);
		}
		if (metadata?.fingerprint) {
			details.push(`Fingerprint: ${metadata.fingerprint.replace(/:/g, '').slice(0, 12)}`);
		}
		choices.push({
			label: getIOSCertificateLabel(metadata?.commonName || certificate.fullname || certificate.name, organizations, metadata),
			description: `Expires: ${new Date(certificate.after).toLocaleString('en-US')}`,
			detail: details.join(' · '),
			id: identity || certificate.fullname,
			pem: certificate.pem
		});
	}
	return choices;
}
import { normalizeIOSOrganizations, readIOSCertificateMetadata, IOSCertificateMetadata } from '../../common/iosCertificates';
import type { IosCert } from '../../types/common';

