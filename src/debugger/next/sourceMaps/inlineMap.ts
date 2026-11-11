import { RawSourceMap } from 'source-map';

const INLINE_PREFIX = 'sourceMappingURL=data:application/json';

export function extractInlineMap(source: string): RawSourceMap | null {
	const idx = source.lastIndexOf(INLINE_PREFIX);
	if (idx === -1) {
		return null;
	}
	const tail = source.slice(idx);
	const match = /sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/.exec(tail);
	if (!match) {
		return null;
	}
	try {
		const json = Buffer.from(match[1], 'base64').toString('utf8');
		return JSON.parse(json) as RawSourceMap;
	} catch {
		return null;
	}
}
