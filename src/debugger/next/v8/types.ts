/** CDP types — only the fields the adapter actually uses. */

export interface CDPLocation {
	scriptId: string;
	lineNumber: number;   // 0-based
	columnNumber: number; // 0-based
}

export interface CDPRemoteObject {
	type: string;          // 'object' | 'function' | 'string' | 'number' | 'boolean' | 'undefined' | 'symbol' | 'bigint'
	value?: unknown;       // present for primitives
	description?: string;  // human-readable, e.g. "Object", "Array(3)"
	objectId?: string;     // present for objects/functions — use for getProperties
}

export interface CDPScope {
	type: string;          // 'local' | 'closure' | 'global' | 'block' | 'script' | ...
	object: CDPRemoteObject;
	name?: string;
}

export interface CDPPropertyDescriptor {
	name: string;
	value?: CDPRemoteObject;
	enumerable: boolean;
}

export interface CDPCallFrame {
	callFrameId: string;
	functionName: string;
	location: CDPLocation;
	url: string;
	scopeChain?: CDPScope[];
}

export interface CDPPausedParams {
	callFrames: CDPCallFrame[];
	reason: string;
	hitBreakpoints?: string[];
	/** Present when reason is "exception" — the thrown value. */
	data?: CDPRemoteObject;
}

export interface CDPScriptParsedParams {
	scriptId: string;
	url: string;
}

export interface CDPBreakpointResolvedParams {
	breakpointId: string;
	location: CDPLocation;
}

export interface CDPSetBreakpointByUrlParams {
	url: string;
	lineNumber: number;
	columnNumber?: number;
	condition?: string;
}

export interface CDPSetBreakpointByUrlResult {
	breakpointId: string;
	locations: CDPLocation[];
}
