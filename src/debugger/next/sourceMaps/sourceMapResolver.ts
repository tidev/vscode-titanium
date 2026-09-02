import { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BasicSourceMapConsumer, IndexedSourceMapConsumer, RawSourceMap, SourceMapConsumer } from 'source-map';
import { detectProjectType } from './projectType';
import { extractInlineMap } from './inlineMap';
import { rebaseSourcePath } from './paths';
import { GeneratedLocation, Platform, ScriptInfo, SourceLocation } from './types';

interface MapEntry {
	consumer: BasicSourceMapConsumer | IndexedSourceMapConsumer;
	sourceRoot: string | undefined;
	rawSources: string[];
}

interface ResolvedScriptBase {
	v8url: string;
	generatedFile: string;
	userSources: string[];
	sourceByInlineKey: Map<string, string>;
	inlineKeyBySource: Map<string, string>;
}

// One-stage lookup: inline map (or sidecar when source counts match) maps
// directly to user source line/col space.
interface SimpleScript extends ResolvedScriptBase {
	strategy: 'simple';
	inline: MapEntry;
}

// Two-stage lookup: inline map bridges the babel intermediate; sidecar maps
// the intermediate to the user source. Used for app.js in Alloy projects.
interface ChainScript extends ResolvedScriptBase {
	strategy: 'chain';
	inline: MapEntry;
	alloy: MapEntry;
	// Name of the inline source representing the alloy intermediate (e.g. 'app.js').
	chainInlineKey: string;
}

type ResolvedScript = SimpleScript | ChainScript;

const ANDROID_ASSETS_REL = [ 'build', 'android', 'assets' ];
const ANDROID_MAP_REL = [ 'build', 'map', 'Resources', 'android' ];

export class SourceMapResolver {

	private projectRoot = '';
	private projectType: 'classic' | 'alloy' = 'classic';
	private readonly scripts = new Map<string, ResolvedScript>();
	private readonly scriptsBySource = new Map<string, ResolvedScript[]>();
	// All JS files found in build/android/assets/, keyed by V8 URL.
	// Populated for every .js file regardless of whether a source map was found,
	// so we can return the raw generated file as a fallback source for SDK scripts.
	private readonly assetByV8url = new Map<string, string>();

	async init(projectRoot: string, platform: Platform): Promise<void> {
		if (this.scripts.size > 0) {
			throw new Error('SourceMapResolver.init() called twice; call dispose() first');
		}
		if (platform !== 'android') {
			throw new Error(`SourceMapResolver: only 'android' is supported in Phase 1c; got '${platform}'`);
		}
		this.projectRoot = projectRoot;
		const projectType = await detectProjectType(projectRoot);
		this.projectType = projectType;
		const assetsDir = path.join(projectRoot, ...ANDROID_ASSETS_REL);
		const jsFiles = await walkJs(assetsDir);

		for (const generatedFile of jsFiles) {
			const rel = path.relative(assetsDir, generatedFile).split(path.sep).join('/');
			const v8url = '/' + rel;
			// Track every asset regardless of source map so generatedFileFor() can
			// return a real path for SDK scripts that have no source map.
			this.assetByV8url.set(v8url, generatedFile);
			const fileText = await fs.readFile(generatedFile, 'utf8');
			const rawInline = extractInlineMap(fileText);
			if (!rawInline) {
				continue;
			}

			const inline = await loadMapEntry(rawInline);
			let alloy: MapEntry | undefined;
			if (projectType === 'alloy') {
				const alloyMapPath = path.join(projectRoot, ...ANDROID_MAP_REL, ...rel.split('/')) + '.map';
				const rawAlloy = await tryReadRawMap(alloyMapPath);
				if (rawAlloy) {
					alloy = await loadMapEntry(rawAlloy);
				}
			}

			const script = this.buildScript(v8url, generatedFile, inline, alloy);
			this.scripts.set(v8url, script);
			for (const src of script.userSources) {
				const list = this.scriptsBySource.get(src) ?? [];
				list.push(script);
				this.scriptsBySource.set(src, list);
			}
		}
	}

	listScripts(): ScriptInfo[] {
		return Array.from(this.scripts.values()).map(s => ({
			v8url: s.v8url,
			generatedFile: s.generatedFile,
			userSources: [ ...s.userSources ],
		}));
	}

	generatedToSource(url: string, line: number, column: number): SourceLocation | null {
		const script = this.scripts.get(url);
		if (!script) {
			return null;
		}
		if (script.strategy === 'simple') {
			const pos = script.inline.consumer.originalPositionFor({ line, column });
			if (pos.line === null || pos.source === null) {
				return null;
			}
			const userPath = script.sourceByInlineKey.get(pos.source);
			if (!userPath) {
				return null;
			}
			return { source: userPath, line: pos.line, column: pos.column ?? 0 };
		}
		const inlinePos = script.inline.consumer.originalPositionFor({ line, column });
		if (inlinePos.line === null) {
			return null;
		}
		const alloyPos = script.alloy.consumer.originalPositionFor({
			line: inlinePos.line,
			column: inlinePos.column ?? 0,
		});
		if (alloyPos.line === null || alloyPos.source === null) {
			return null;
		}
		const userPath = script.sourceByInlineKey.get(alloyPos.source);
		if (!userPath) {
			return null;
		}
		return { source: userPath, line: alloyPos.line, column: alloyPos.column ?? 0 };
	}

	sourceToGenerated(absPath: string, line: number, column: number): GeneratedLocation[] {
		const candidates = this.scriptsBySource.get(absPath);
		if (!candidates) {
			return [];
		}
		const results: GeneratedLocation[] = [];
		for (const script of candidates) {
			const key = script.inlineKeyBySource.get(absPath);
			if (!key) {
				continue;
			}
			if (script.strategy === 'simple') {
				// LEAST_UPPER_BOUND finds the first mapped segment at or after the requested
				// column on the target source line. GREATEST_LOWER_BOUND (the default) can
				// walk back to the previous line when column 0 has no mapping (e.g. a tab
				// before the first token), producing an off-by-one generated line.
				const pos = script.inline.consumer.generatedPositionFor({ source: key, line, column, bias: SourceMapConsumer.LEAST_UPPER_BOUND });
				if (pos.line === null) {
					continue;
				}
				results.push({ url: script.v8url, line: pos.line, column: pos.column ?? 0 });
				continue;
			}
			const intermediatePos = script.alloy.consumer.generatedPositionFor({ source: key, line, column, bias: SourceMapConsumer.LEAST_UPPER_BOUND });
			if (intermediatePos.line === null) {
				continue;
			}
			const genPos = script.inline.consumer.generatedPositionFor({
				source: script.chainInlineKey,
				line: intermediatePos.line,
				column: intermediatePos.column ?? 0,
				bias: SourceMapConsumer.LEAST_UPPER_BOUND,
			});
			if (genPos.line === null) {
				continue;
			}
			results.push({ url: script.v8url, line: genPos.line, column: genPos.column ?? 0 });
		}
		return results;
	}

	/**
	 * Returns true when the V8 URL has a source map that resolves to at least one
	 * user source file. Scripts that have a source map but whose sources all resolve
	 * to SDK-internal paths (e.g. ti.main.js after the babel pass) return false.
	 */
	isKnownScript(v8url: string): boolean {
		const script = this.scripts.get(v8url);
		return script !== undefined && script.userSources.length > 0;
	}

	/** Returns the absolute path of the generated file for a V8 URL, or null if unknown. */
	generatedFileFor(v8url: string): string | null {
		return this.assetByV8url.get(v8url) ?? null;
	}

	dispose(): void {
		for (const script of this.scripts.values()) {
			script.inline.consumer.destroy();
			if (script.strategy === 'chain') {
				script.alloy.consumer.destroy();
			}
		}
		this.scripts.clear();
		this.scriptsBySource.clear();
		this.assetByV8url.clear();
	}

	/**
	 * For Alloy projects, only files under the `app/` subtree are user-authored;
	 * `Resources/` contains compiled output from Alloy and SDK bundled scripts.
	 * Classic projects treat all rebased paths as user sources.
	 */
	private isUserSourcePath(absPath: string): boolean {
		if (this.projectType === 'alloy') {
			return absPath.startsWith(path.join(this.projectRoot, 'app') + path.sep);
		}
		return absPath.startsWith(path.join(this.projectRoot, 'Resources') + path.sep);
	}

	private buildScript(v8url: string, generatedFile: string, inline: MapEntry, alloy: MapEntry | undefined): ResolvedScript {
		// Strategy heuristic. When inline and alloy expose the same number of
		// sources, Alloy emitted the babel input *as if* it were the user file —
		// the inline placeholder names (`index.js`, `widget.js`, `util.js`) line
		// up index-by-index with alloy's real source names, and inline's
		// originalPositionFor already returns user-source line/col. When the
		// counts differ (notably `app.js`, where inline has one source and alloy
		// has two), inline is mapping straight to the alloy intermediate and we
		// need the sidecar to bridge to the user file.
		if (!alloy) {
			return this.buildSimple(v8url, generatedFile, inline, inline);
		}
		if (inline.consumer.sources.length === alloy.rawSources.length) {
			return this.buildSimple(v8url, generatedFile, inline, alloy);
		}
		return this.buildChain(v8url, generatedFile, inline, alloy);
	}

	private buildSimple(v8url: string, generatedFile: string, inline: MapEntry, sourceMap: MapEntry): SimpleScript {
		// Prefer the sidecar as the lookup consumer when one is available. Alloy
		// controller inline maps can have column-precise generatedPositionFor
		// entries while omitting the per-line segments originalPositionFor needs,
		// making V8 pause locations unmappable. The sidecar has correct line-level
		// mappings in both directions and is the authoritative source for Alloy.
		const lookupMap = sourceMap !== inline ? sourceMap : inline;
		const lookupKeys = lookupMap.consumer.sources;
		const sourceByInlineKey = new Map<string, string>();
		const inlineKeyBySource = new Map<string, string>();
		for (let i = 0; i < lookupKeys.length; i++) {
			const userRaw = sourceMap.rawSources[i];
			if (userRaw === undefined) {
				continue;
			}
			const rebased = rebaseSourcePath(userRaw, sourceMap.sourceRoot, this.projectRoot);
			if (!rebased || !this.isUserSourcePath(rebased)) {
				continue;
			}
			sourceByInlineKey.set(lookupKeys[i], rebased);
			inlineKeyBySource.set(rebased, lookupKeys[i]);
		}
		const userSources = Array.from(sourceByInlineKey.values());
		if (sourceMap !== inline) {
			inline.consumer.destroy();
		}
		return {
			v8url, generatedFile, userSources, inline: lookupMap,
			strategy: 'simple', sourceByInlineKey, inlineKeyBySource,
		};
	}

	private buildChain(v8url: string, generatedFile: string, inline: MapEntry, alloy: MapEntry): ChainScript {
		const alloySources = alloy.consumer.sources;
		const sourceByInlineKey = new Map<string, string>();
		const inlineKeyBySource = new Map<string, string>();
		for (let i = 0; i < alloySources.length; i++) {
			const rebased = rebaseSourcePath(alloy.rawSources[i], alloy.sourceRoot, this.projectRoot);
			if (!rebased || !this.isUserSourcePath(rebased)) {
				continue;
			}
			sourceByInlineKey.set(alloySources[i], rebased);
			inlineKeyBySource.set(rebased, alloySources[i]);
		}
		const userSources = Array.from(sourceByInlineKey.values());
		const chainInlineKey = inline.consumer.sources[0];
		return {
			v8url, generatedFile, userSources, inline, alloy,
			strategy: 'chain', sourceByInlineKey, inlineKeyBySource, chainInlineKey,
		};
	}
}

async function loadMapEntry(raw: RawSourceMap): Promise<MapEntry> {
	const consumer = await new SourceMapConsumer(raw);
	return {
		consumer,
		sourceRoot: raw.sourceRoot,
		rawSources: raw.sources.slice(),
	};
}

async function tryReadRawMap(p: string): Promise<RawSourceMap | null> {
	let text: string;
	try {
		text = await fs.readFile(p, 'utf8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}
		throw err;
	}
	return JSON.parse(text) as RawSourceMap;
}

async function walkJs(dir: string): Promise<string[]> {
	let entries: Dirent[];
	try {
		entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
	} catch (err) {
		if ([ 'ENOENT', 'ENOTDIR' ].includes((err as NodeJS.ErrnoException).code ?? '')) {
			return [];
		}
		throw err;
	}
	const results: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.js')) {
			continue;
		}
		// Dirent.parentPath was added in Node 20 and gives the directory holding the entry.
		const parent = (entry as Dirent & { parentPath: string }).parentPath;
		results.push(path.join(parent, entry.name));
	}
	return results;
}
