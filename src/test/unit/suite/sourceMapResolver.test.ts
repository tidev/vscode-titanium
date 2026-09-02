import { strict as assert } from 'assert';
import * as path from 'path';
import { detectProjectType } from '../../../debugger/next/sourceMaps/projectType';
import { SourceMapResolver } from '../../../debugger/next/sourceMaps/sourceMapResolver';

const FIXTURES_ROOT = path.resolve(__dirname, '../../../../src/test/common/fixtures/debugger-next');
const CLASSIC_FIXTURE = path.join(FIXTURES_ROOT, 'classic');
const ALLOY_FIXTURE = path.join(FIXTURES_ROOT, 'alloy');

describe('detectProjectType', () => {
	it('returns "classic" when no app/alloy.js is present', async () => {
		const type = await detectProjectType(CLASSIC_FIXTURE);
		assert.equal(type, 'classic');
	});

	it('returns "alloy" when app/alloy.js is present', async () => {
		const type = await detectProjectType(ALLOY_FIXTURE);
		assert.equal(type, 'alloy');
	});
});

describe('SourceMapResolver / lifecycle', () => {
	it('throws if init() is called a second time without dispose()', async () => {
		const resolver = new SourceMapResolver();
		await resolver.init(CLASSIC_FIXTURE, 'android');
		await assert.rejects(
			() => resolver.init(CLASSIC_FIXTURE, 'android'),
			/called twice/,
		);
		resolver.dispose();
	});
});

describe('SourceMapResolver / classic', () => {
	let resolver: SourceMapResolver;

	beforeEach(async () => {
		resolver = new SourceMapResolver();
		await resolver.init(CLASSIC_FIXTURE, 'android');
	});

	afterEach(() => {
		resolver.dispose();
	});

	it('lists deployed scripts as /-rooted V8 URLs', () => {
		const urls = resolver.listScripts().map(s => s.v8url).sort();
		assert.deepEqual(urls, [ '/app.js', '/lib/helper.js', '/ti.main.js', '/utils.js' ]);
	});

	it('excludes SDK-internal sources from userSources when sourceRoot is outside the project', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/ti.main.js');
		assert.ok(script, '/ti.main.js must appear (it has an inline source map)');
		assert.deepEqual(script.userSources, [],
			'sourceRoot pointing into the SDK install dir must not produce userSources');
	});

	it('isKnownScript returns false for SDK bootstrap scripts in classic projects', () => {
		assert.equal(resolver.isKnownScript('/ti.main.js'), false,
			'ti.main.js with an SDK-internal sourceRoot must not be treated as a user script');
	});

	it('exposes the deployed file path for each script', () => {
		const utils = resolver.listScripts().find(s => s.v8url === '/utils.js');
		assert.ok(utils);
		assert.ok(utils.generatedFile.endsWith(path.join('build', 'android', 'assets', 'utils.js')),
			`unexpected generatedFile: ${utils.generatedFile}`);
	});

	it('resolves /utils.js to the Android override source', () => {
		const loc = resolver.generatedToSource('/utils.js', 1, 0);
		assert.ok(loc, 'expected a SourceLocation, got null');
		assert.ok(loc.source.endsWith(path.join('Resources', 'android', 'utils.js')),
			`expected override path; got ${loc.source}`);
		assert.ok(loc.source.startsWith(CLASSIC_FIXTURE),
			`expected source rebased under fixture; got ${loc.source}`);
	});

	it('resolves a subfolder script to its source', () => {
		const loc = resolver.generatedToSource('/lib/helper.js', 1, 0);
		assert.ok(loc);
		assert.ok(loc.source.endsWith(path.join('Resources', 'lib', 'helper.js')),
			`unexpected source: ${loc.source}`);
	});

	it('resolves /app.js to Resources/app.js', () => {
		// app.js opens with a 4-line JSDoc block; first mapped position is line 5
		// (the const tabGroup declaration). Lines before that have no mapping.
		const loc = resolver.generatedToSource('/app.js', 5, 0);
		assert.ok(loc);
		assert.ok(loc.source.endsWith(path.join('Resources', 'app.js')),
			`unexpected source: ${loc.source}`);
	});

	it('returns null for an unknown V8 URL', () => {
		assert.equal(resolver.generatedToSource('/does/not/exist.js', 1, 0), null);
	});

	it('lists override source path in userSources', () => {
		const utils = resolver.listScripts().find(s => s.v8url === '/utils.js');
		assert.ok(utils);
		const hasOverride = utils.userSources.some(s => s.endsWith(path.join('Resources', 'android', 'utils.js')));
		assert.ok(hasOverride, `userSources missing override; got ${utils.userSources.join(', ')}`);
	});

	it('maps user source path back to its V8 URL', () => {
		const sourcePath = path.join(CLASSIC_FIXTURE, 'Resources', 'android', 'utils.js');
		const generated = resolver.sourceToGenerated(sourcePath, 1, 0);
		assert.ok(generated.length > 0, 'expected at least one GeneratedLocation');
		assert.equal(generated[0].url, '/utils.js');
	});

	it('maps an indented source line (column 0) to the correct generated line', () => {
		// Source line 2 is tab-indented; the first mapped column in the source map is > 0.
		// GREATEST_LOWER_BOUND bias walks back to line 1 in that case, producing the wrong
		// generated line. LEAST_UPPER_BOUND must be used to get line 2.
		const sourcePath = path.join(CLASSIC_FIXTURE, 'Resources', 'android', 'utils.js');
		const generated = resolver.sourceToGenerated(sourcePath, 2, 0);
		assert.ok(generated.length > 0, 'expected a GeneratedLocation for line 2');
		assert.equal(generated[0].line, 2, 'generated line must be 2, not 1 (off-by-one from wrong bias)');
	});

	it('returns empty array for a source path the resolver does not know', () => {
		const generated = resolver.sourceToGenerated('/totally/unknown/path.js', 1, 0);
		assert.deepEqual(generated, []);
	});
});

describe('SourceMapResolver / alloy', () => {
	let resolver: SourceMapResolver;

	beforeEach(async () => {
		resolver = new SourceMapResolver();
		await resolver.init(ALLOY_FIXTURE, 'android');
	});

	afterEach(() => {
		resolver.dispose();
	});

	it('lists deployed scripts as /-rooted V8 URLs', () => {
		const urls = resolver.listScripts().map(s => s.v8url).sort();
		assert.deepEqual(urls, [
			'/alloy/controllers/index.js',
			'/alloy/widgets/mywidget/controllers/widget.js',
			'/app.js',
			'/ti.main.js',
			'/util.js',
		]);
	});

	it('excludes Resources/ sources from userSources in alloy projects', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/ti.main.js');
		assert.ok(script, '/ti.main.js should be in scripts (it has an inline source map)');
		assert.deepEqual(script.userSources, [],
			'Resources/ paths must not appear in userSources for alloy projects');
	});

	it('isKnownScript returns false for scripts whose sources are only under Resources/', () => {
		assert.equal(resolver.isKnownScript('/ti.main.js'), false,
			'SDK bootstrap scripts that map to Resources/ should not be treated as user scripts');
	});

	it('lists the platform-override controller as a userSource', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/alloy/controllers/index.js');
		assert.ok(script);
		const expected = path.join(ALLOY_FIXTURE, 'app', 'controllers', 'android', 'index.js');
		assert.ok(script.userSources.includes(expected),
			`userSources missing expected path. got: ${script.userSources.join(', ')}`);
	});

	it('lists the widget platform-override controller as a userSource', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/alloy/widgets/mywidget/controllers/widget.js');
		assert.ok(script);
		const expected = path.join(ALLOY_FIXTURE, 'app', 'widgets', 'mywidget', 'controllers', 'android', 'widget.js');
		assert.ok(script.userSources.includes(expected),
			`userSources missing expected path. got: ${script.userSources.join(', ')}`);
	});

	it('lists the lib platform-override as a userSource', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/util.js');
		assert.ok(script);
		const expected = path.join(ALLOY_FIXTURE, 'app', 'lib', 'android', 'util.js');
		assert.ok(script.userSources.includes(expected),
			`userSources missing expected path. got: ${script.userSources.join(', ')}`);
	});

	it('lists app/alloy.js as a userSource of /app.js', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/app.js');
		assert.ok(script);
		const expected = path.join(ALLOY_FIXTURE, 'app', 'alloy.js');
		assert.ok(script.userSources.includes(expected),
			`userSources missing expected path. got: ${script.userSources.join(', ')}`);
	});

	it('excludes template.js placeholders from userSources', () => {
		for (const script of resolver.listScripts()) {
			for (const src of script.userSources) {
				assert.ok(!src.endsWith('template.js'),
					`${script.v8url} leaked a template placeholder: ${src}`);
			}
		}
	});

	it('excludes the alloy framework template path from userSources', () => {
		const script = resolver.listScripts().find(s => s.v8url === '/app.js');
		assert.ok(script);
		for (const src of script.userSources) {
			assert.ok(!src.includes('Alloy/template'),
				`/app.js leaked framework template path: ${src}`);
		}
	});

	it('maps alloy.js source to /app.js via chain strategy sourceToGenerated', () => {
		// The inline map covers generated lines 6-15 and 33-40. Lines 6-15 map through
		// the sidecar to template/app.js (boilerplate), not user code. Generated line 33
		// maps through the inline map to intermediate line 22, which the sidecar maps to
		// app/alloy.js line 5 — the first user-source entry in the chain.
		const appJsLoc = resolver.generatedToSource('/app.js', 33, 0);
		assert.ok(appJsLoc, '/app.js line 33 must resolve to a source via the chain strategy');
		assert.ok(appJsLoc.source.endsWith(path.join('app', 'alloy.js')),
			`expected alloy.js as chain source; got ${appJsLoc.source}`);

		const generated = resolver.sourceToGenerated(appJsLoc.source, appJsLoc.line, appJsLoc.column);
		assert.ok(generated.length > 0, 'chain sourceToGenerated must return at least one location');
		assert.equal(generated[0].url, '/app.js', 'must map back to /app.js via chain');
	});

	it('round-trips a user source line through the two-stage chain', () => {
		const sourcePath = path.join(ALLOY_FIXTURE, 'app', 'controllers', 'android', 'index.js');
		const generated = resolver.sourceToGenerated(sourcePath, 1, 0);
		assert.ok(generated.length > 0,
			'expected at least one GeneratedLocation for the override controller');
		assert.equal(generated[0].url, '/alloy/controllers/index.js');

		const back = resolver.generatedToSource(generated[0].url, generated[0].line, generated[0].column);
		assert.ok(back, 'expected generatedToSource to return a SourceLocation for the round-trip');
		assert.equal(back.source, sourcePath);
		assert.equal(back.line, 1);
	});

	it('round-trips the lib override through the chain', () => {
		const sourcePath = path.join(ALLOY_FIXTURE, 'app', 'lib', 'android', 'util.js');
		const generated = resolver.sourceToGenerated(sourcePath, 1, 0);
		assert.ok(generated.length > 0);
		assert.equal(generated[0].url, '/util.js');

		const back = resolver.generatedToSource(generated[0].url, generated[0].line, generated[0].column);
		assert.ok(back);
		assert.equal(back.source, sourcePath);
		assert.equal(back.line, 1);
	});

	it('returns null for an unknown V8 URL', () => {
		assert.equal(resolver.generatedToSource('/not-a-script.js', 1, 0), null);
	});
});
