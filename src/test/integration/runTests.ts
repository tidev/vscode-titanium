import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import { ExTester, ReleaseQuality } from 'vscode-extension-tester';
import { getIntegrationFixturesDirectory, testSetup } from './util/common';

async function main (): Promise<void> {
	// We create a temporary directory for the "Extension directory" so that only our extension and
	// the base vscode extensions get loaded
	const tempDirectory = tmp.dirSync();
	try {
		await testSetup();

		// When setting the version to "insider" we want to actually use "latest" and then switch
		// to the ReleaseQuality.Insider stream, not set the version as "insider"
		const vsCodeVersion = (!process.env.CODE_STREAM || process.env.CODE_STREAM === 'insider') ? 'latest' : process.env.CODE_STREAM;
		const mochaConfig = path.join(__dirname, '.mocharc.js');
		const settings = path.join(getIntegrationFixturesDirectory(), 'settings.json');
		const releaseQuality = process.env.CODE_STREAM === 'insider' ? ReleaseQuality.Insider : ReleaseQuality.Stable;

		const tester = new ExTester(undefined, releaseQuality, tempDirectory.name);
		const files = process.env.SMOKE ? 'out/test/integration/suite/**/*.smoke.js' : 'out/test/integration/suite/**/*.test.js';

		tester.setupAndRunTests(files, vsCodeVersion, undefined, { config: mochaConfig, settings, resources: [] });
	} finally {
		fs.removeSync(tempDirectory.name);
	}
}

main();
