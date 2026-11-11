export type ProjectType = 'alloy' | 'classic';
export type Platform = 'android' | 'ios';

export interface SourceLocation {
	source: string;
	line: number;
	column: number;
}

export interface GeneratedLocation {
	url: string;
	line: number;
	column: number;
}

export interface ScriptInfo {
	v8url: string;
	generatedFile: string;
	userSources: string[];
}
