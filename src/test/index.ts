import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';

declare module 'mocha' {
	interface MochaOptions {
		reporterOption?: string;
	}
}

export function run (): Promise<void> {
	// Create the mocha test
	const reportPath = path.join(__dirname, '..', '..', 'junit_report.xml');

	const mocha = new Mocha({
		ui: 'tdd',
		reporter: 'mocha-multi-reporters',
		reporterOption: {
			reporterEnabled: 'mocha-jenkins-reporter, spec',
			mochaJenkinsReporterReporterOptions: {
				junit_report_path: reportPath // eslint-disable-line @typescript-eslint/camelcase
			}
		}
	});
	mocha.useColors(true);

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		glob('**/**.test.js', { cwd: testsRoot }, (error, files) => {
			if (error) {
				return reject(error);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						return reject(new Error(`${failures} tests failed.`));
					} else {
						return resolve();
					}
				});
			} catch (err) {
				return reject(err);
			}
		});
	});
}
