import { globSync } from 'glob';
import Mocha from 'mocha';
import * as path from 'path';

async function run (): Promise<void> {
	const timeout = process.env.DEBUG ? 99999 : 5000;
	const mocha = new Mocha({
		ui: 'bdd',
		reporter: 'spec',
		color: true,
		timeout
	});
	const testsRoot = path.resolve(__dirname);
	const files = globSync('suite/**/*.test.js', { cwd: testsRoot });

	files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));

	await new Promise<void>((resolve, reject) => {
		mocha.run(failures => {
			if (failures > 0) {
				return reject(new Error(`${failures} tests failed.`));
			}

			resolve();
		});
	});
}

run().catch(err => {
	console.error(err);
	process.exit(1);
});
