import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';

export function run (): Promise<void> {
	// Create the mocha test
	const reportPath = path.join(__dirname, '..', '..', 'junit_report.xml');

	const mocha = new Mocha({
		ui: 'tdd',
		reporter: 'mocha-multi-reporters',
		reporterOptions: {
			reporterEnabled: 'mocha-jenkins-reporter, spec',
			mochaJenkinsReporterReporterOptions: {
				junit_report_path: reportPath
			}
		}
	});
	mocha.useColors(true);

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				e(err);
			}
		});
	});
}
