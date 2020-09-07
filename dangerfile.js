const eslint = require('@seadub/danger-plugin-eslint').default;
const junit = require('@seadub/danger-plugin-junit').default;
const dependencies = require('@seadub/danger-plugin-dependencies').default;

async function linkToVsix () {
	if (process.env.BUILD_STATUS === 'SUCCESS' || process.env.BUILD_STATUS === 'UNSTABLE') {
		const { version } = require('./package.json');
		const vsixName = `vscode-titanium-${version}.vsix`;
		const vsixLink = danger.utils.href(`${process.env.BUILD_URL}artifact/${vsixName}`, 'Here\'s the built vsix for this change');
		message(`:floppy_disk: ${vsixLink}.`);
	}
}

async function main() {
	await Promise.all([
		eslint(null, [ '.ts' ]),
		junit({ pathToReport: './junit_report.xml', name: 'Unit Tests' }),
		junit({ pathToReport: './junit_report-ui.xml', name: 'Integration Tests' }),
		dependencies({ type: 'npm' }),
		linkToVsix()
	]);
}

main()
	.then(() => process.exit(0))
	.catch(err => {
		fail(err.toString());
		process.exit(1);
	});
