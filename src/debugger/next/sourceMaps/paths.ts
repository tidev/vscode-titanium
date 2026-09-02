import * as path from 'path';

const SEGMENT_RE = /(?:^|\/)(app\/|Resources\/)/;

export function rebaseSourcePath(rawSource: string, sourceRoot: string | undefined, projectRoot: string): string | null {
	const combined = sourceRoot && sourceRoot.length > 0
		? path.posix.join(sourceRoot, rawSource)
		: rawSource;
	// An absolute combined path that isn't rooted inside the project is an SDK-internal
	// file (e.g. ti.main.js whose sourceRoot points into the mobilesdk directory).
	// Rebase would extract a tail like "Resources/android/ti.main.js" and incorrectly
	// resolve it into the user's project — bail out early instead.
	// Normalise projectRoot to posix separators for the comparison (combined is always
	// posix because path.posix.join was used above), and add a trailing slash so that
	// a root of "/foo" does not incorrectly prefix-match "/foobar".
	const projectRootPosix = projectRoot.split(path.sep).join('/');
	if (path.posix.isAbsolute(combined) && !combined.startsWith(projectRootPosix + '/')) {
		return null;
	}
	const match = SEGMENT_RE.exec(combined);
	if (!match) {
		return null;
	}
	const sliceStart = match.index === 0 ? 0 : match.index + 1;
	const tail = combined.slice(sliceStart);
	return path.join(projectRoot, ...tail.split('/'));
}
