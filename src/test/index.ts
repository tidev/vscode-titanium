import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import NYC = require('nyc');

export async function run (): Promise<void> {
	const reportPath = path.join(__dirname, '..', '..', 'junit_report.xml');

	const mocha = new Mocha({
		ui: 'tdd',
		reporter: 'mocha-multi-reporters',
		reporterOptions: {
			reporterEnabled: 'mocha-jenkins-reporter, spec',
			mochaJenkinsReporterReporterOptions: {
				junit_report_path: reportPath // eslint-disable-line @typescript-eslint/camelcase
			}
		}
	});
	mocha.useColors(true);

	const nyc = new NYC({
		cwd: path.join(__dirname, '..', '..'),
		exclude: [ '.vscode-test/**', '**/test/**' ],
		reporter: [ 'text', 'html' ],
		all: true,
		instrument: true,
		hookRequire: true,
		hookRunInContext: true,
		hookRunInThisContext: true
	});

	nyc.reset();
	nyc.wrap();

	await nyc.createTempDirectory();

	const testsRoot = path.resolve(__dirname, '..');

	const files = glob.sync('**/**.test.js', { cwd: testsRoot });

	// Add files to the test suite
	files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

	try {
		// Run the mocha test
		await new Promise((resolve, reject) => {
			mocha.run(failures => {
				if (failures > 0) {
					return reject(new Error(`${failures} tests failed.`));
				} else {
					return resolve();
				}
			});
		});
	} finally {
		nyc.writeCoverageFile();
		nyc.report();
	}
}
