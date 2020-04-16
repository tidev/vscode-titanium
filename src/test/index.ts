import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as fs from 'fs-extra';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import NYC = require('nyc');

export async function run (): Promise<void> {
	// Create the mocha test
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
		exclude: '.vscode-test/**',
		include: 'src/**',
		reporter: 'html'
	});

	await nyc.createTempDirectory();

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
	}).then(async () => {
		const coverage = (global as any).__coverage__;
		if (coverage) {
			const coverageFolder = path.join('/Users/awam/git/editors/vscode-appcelerator-titanium/.nyc_output');
			console.log(coverageFolder);
			fs.ensureDirSync(coverageFolder);
			const writeStream = fs.createWriteStream(
				path.join(coverageFolder, 'coverage.json')
			);
			writeStream.write(JSON.stringify(coverage));
			writeStream.end();
			await nyc.report();
		}
	});
}
