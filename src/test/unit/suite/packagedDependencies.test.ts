import { execFileSync } from 'child_process';
import * as path from 'path';
import { strict as assert } from 'assert';

describe('packaged dependencies', () => {
	it('tracks the vendored iOS debugger adapter artifacts required by npm ci', () => {
		const repoRoot = path.resolve(__dirname, '../../../..');
		const requiredFiles = [
			'packages/tidev-remotedebug-ios-webkit-adapter/out/server.js',
			'packages/tidev-remotedebug-ios-webkit-adapter/out/server.d.ts',
			'packages/tidev-remotedebug-ios-webkit-adapter/out/adapters/iosAdapter.js',
			'packages/tidev-remotedebug-ios-webkit-adapter/out/protocols/ios/ios.js'
		];

		requiredFiles.forEach(relativePath => {
			execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
				cwd: repoRoot,
				stdio: 'pipe'
			});
		});
	});
});
