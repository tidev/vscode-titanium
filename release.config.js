module.exports = {
	plugins: [
		'@semantic-release/commit-analyzer',
		'@semantic-release/release-notes-generator',
		'@semantic-release/changelog',
		[
			'semantic-release-vsce',
			{
				packageVsix: true
			}
		],
		'@semantic-release/git',
		[
			'@semantic-release/github',
			{
				assets: '*.vsix',
				addReleases: 'bottom',
				successComment: false
			}
		]
	]
};
