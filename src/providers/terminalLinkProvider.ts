import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { SourceMapConsumer } from 'source-map';

import { ExtensionContainer } from '../container';
import { normalisedPlatform } from '../utils';
import { Platform } from 'src/types/common';

interface TiTerminalLink extends vscode.TerminalLink {
	terminalName: string;
	projectDirectory: string;
	filename: string;
	line: number;
	column: number;
	platform?: Platform;
}

interface OriginalSourceData {
	column: number;
	filename: string;
	line: number;
}

export class TiTerminalLinkProvider implements vscode.TerminalLinkProvider {

	provideTerminalLinks(context: vscode.TerminalLinkContext): TiTerminalLink[] {
		const links: TiTerminalLink[] = [];
		const result = context.line.match(/at\s+[\w.]*\s+\(((\/?(?:\w+\/?)+.js):(\d+:\d+))\)/);

		if (!result) {
			return links;
		}

		const [ , toLink, filename, position ] = result;

		const projectInfo = this.resolveProjectInfo(context.terminal);

		if (projectInfo) {
			const [ line, column ] = position.split(':').map(value => parseInt(value, 10));
			const startIndex = context.line.indexOf(toLink);
			links.push({
				startIndex,
				length: toLink.length,
				tooltip: 'Open file',
				line,
				column,
				terminalName: context.terminal.name,
				projectDirectory: projectInfo.projectDirectory,
				filename,
				platform: projectInfo.platform
			});
		}

		return links;
	}

	async handleTerminalLink(link: TiTerminalLink): Promise<void> {
		const mappedInfo = await this.resolveSourceMap(link);

		if (!mappedInfo) {
			return;
		}

		const { column, filename, line } = mappedInfo;

		const range = new vscode.Range(line, column, line, column);
		const uri = vscode.Uri.parse(filename);
		await vscode.window.showTextDocument(uri, { selection: range });
	}

	/**
	 * Resolves a project directory for a given TerminalLink request. If Terminal.creationOptions
	 * includes a cwd then that is returned, otherwise Terminal.name is used to lookup against a
	 * running task in our running tasks list.
	 *
	 * @param {vscode.Terminal} terminal - The Terminal instance from the TerminalLink request
	 * @returns {String|undefined} The project directory or undefined if it cannot be resolved.
	 */
	private resolveProjectInfo(terminal: vscode.Terminal): { platform?: Platform, projectDirectory: string; }|undefined {

		const { creationOptions, name } = terminal;

		if ('cwd' in creationOptions && creationOptions.cwd !== undefined) {
			const projectDirectory = typeof creationOptions.cwd === 'string' ? creationOptions.cwd : creationOptions.cwd.fsPath;

			const platformMatches = name.toLowerCase().match(/(android|ios|iphone|ipad)/);
			const platform = platformMatches ? platformMatches[1] as Platform : undefined;

			return { projectDirectory, platform };
		}

		if (ExtensionContainer.runningTasks.has(name)) {
			const task = ExtensionContainer.runningTasks.get(name);
			const buildOptions = task?.buildOptions;

			if (!buildOptions) {
				// This should never be the case, but lets handle it
				return;
			}

			const { platform, projectDir } = buildOptions;

			return { platform, projectDirectory: projectDir };
		}

		if (!vscode.workspace.workspaceFolders?.length) {
			return;
		}

		// Lets just default to the first folder in the workspace, it'll most likely be correct
		return { projectDirectory: vscode.workspace.workspaceFolders?.[0].uri.fsPath };
	}

	/**
	 * Finds a source map file and finds the original position for the line and column data in a
	 * stack trace.
	 *
	 * @param {TiTerminalLink} link - The link information returned from provideTerminalLinks
	 * @returns {OriginalSourceData|undefined} - The original source data
	 */
	private async resolveSourceMap (link: TiTerminalLink): Promise<OriginalSourceData|undefined> {

		const { column, filename, line, projectDirectory } = link;
		let { platform } = link;

		if (!platform) {
			// naively try to figure out the platform, this logic will probably grow and change over time
			platform = filename.startsWith('/') ? 'android' : 'ios';
		}

		const platformFolderName = normalisedPlatform(platform) === 'ios' ? 'iphone' : 'android';
		const sourceMapFile = path.join(projectDirectory, 'build', 'map', 'Resources', platformFolderName, `${filename}.map`);
		const sourceMap = await fs.readJSON(sourceMapFile);

		const SM = await new SourceMapConsumer(sourceMap);

		const position = SM.originalPositionFor({
			line,
			column
		});

		SM.destroy();

		if (!position || !position.source) {
			return;
		}

		const openLine = position.line || line;
		const openColumn = position.column || column;

		return {
			column: openColumn,
			filename: position.source,
			line: openLine - 1
		};
	}
}

