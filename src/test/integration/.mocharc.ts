import * as path from 'path';
const reportPath = path.join(__dirname, '..', '..', '..', 'junit_report-ui.xml');

module.exports = {
	reporter: 'mocha-multi-reporters',
		reporterOptions: {
			reporterEnabled: 'mocha-jenkins-reporter, spec',
			mochaJenkinsReporterReporterOptions: {
				junit_report_path: reportPath // eslint-disable-line @typescript-eslint/camelcase
			}
		}
};
