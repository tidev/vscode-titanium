const tslint = require('@awam/danger-plugin-tslint').default;
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
		tslint(),
		junit({ pathToReport: './junit_report.xml' }),
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
