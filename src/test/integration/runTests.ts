import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import { ExTester } from 'vscode-extension-tester';
import { testSetup } from './util/common';

async function main (): Promise<void> {
	// We create a temporary directory for the "Extension directory" so that only our extension and
	// the base vscode extensions get loaded
	const tempDirectory = tmp.dirSync();
	try {
		await testSetup();
		const tester = new ExTester(undefined, undefined, tempDirectory.name);
		const mochaConfig = path.join(__dirname, '.mocharc.js');
		tester.setupAndRunTests(undefined, 'out/test/integration/suite/**/*.test.js', undefined, false, true, mochaConfig);
	} finally {
		fs.removeSync(tempDirectory.name);
	}
}

main();
