/* eslint require-atomic-updates: 0 */
import { BasePathTransformer, chromeUtils, IPathMapping, IStackTraceResponseBody, utils } from '@awam/vscode-chrome-debug-core';
import * as path from 'path';
import { DebugProtocol } from 'vscode-debugprotocol';
import { TitaniumAttachRequestArgs, TitaniumLaunchRequestArgs } from '../common/extensionProtocol';
import { determineProjectType, getAppName } from '../common/utils';

export class TitaniumPathTransformer extends BasePathTransformer {

	private appDirectory!: string;
	private platform!: string;
	private _pathMapping!: IPathMapping;
	private _localPathToTargetUrl = new Map<string, string>();
	private _targetUrlToLocalPath = new Map<string, string>();
	private projectType!: string;
	private appName!: string;

	public async attach (args: TitaniumAttachRequestArgs): Promise<void> {
		await this.configureTransformOptions(args);
		return super.attach(args);
	}

	public async launch (args: TitaniumLaunchRequestArgs): Promise<void> {
		await this.configureTransformOptions(args);
		return super.attach(args);
	}

	public async configureTransformOptions (args: TitaniumAttachRequestArgs|TitaniumLaunchRequestArgs): Promise<void> {
		this._pathMapping = args.pathMapping || {};
		this.appDirectory = args.projectDir;
		this.platform = args.platform;
		this.projectType = await determineProjectType(this.appDirectory);
		this.appName = await getAppName(this.appDirectory);
	}

	public setBreakpoints (source: DebugProtocol.Source): DebugProtocol.Source {
		if (!source.path) {
			// sourceReference script, nothing to do
			return source;
		}

		if (utils.isURL(source.path)) {
			// already a url, use as-is
			return source;
		}

		const canonicalPath = utils.canonicalizeUrl(source.path);
		const url = this.getTargetPathFromClientPath(canonicalPath);
		if (url) {
			source.path = url;
			return source;
		} else {
			source.path = canonicalPath;
			return source;
		}
	}

	public async scriptParsed (scriptUrl: string): Promise<string> {
		const localPath = await this.getLocalPath(scriptUrl);

		if (localPath) {
			const canonicalLocalPath = utils.canonicalizeUrl(localPath);
			this._localPathToTargetUrl.set(canonicalLocalPath, scriptUrl);
			this._targetUrlToLocalPath.set(scriptUrl, localPath);

			scriptUrl = localPath;
		}

		return Promise.resolve(scriptUrl);
	}

	public getTargetPathFromClientPath (clientPath: string): string {
		if (path.isAbsolute(clientPath) && this._localPathToTargetUrl.has(utils.canonicalizeUrl(clientPath))) {
			clientPath = this._localPathToTargetUrl.get(utils.canonicalizeUrl(clientPath))!;
		}
		return clientPath;
	}

	public async getLocalPath (sourceUrl: string): Promise<string> {
		const appRoot = this.projectType === 'alloy' ? path.join(this.appDirectory, 'app') : path.join(this.appDirectory, 'Resources');
		const platformRoot = path.join(appRoot, this.platform);
		let defaultPath = '';
		const searchFolders = [ appRoot ];

		if (this.platform === 'ios') {
			// We must encode the app name here as the sourceUrl we're provided
			// is also encoded
			const appName = `${encodeURIComponent(this.appName)}.app`;
			sourceUrl = sourceUrl.split(appName)[1];
		}

		if (this.projectType !== 'alloy') {
			searchFolders.push(platformRoot);
		}

		if (this.projectType === 'alloy') {
			searchFolders.push(path.join(appRoot, 'lib'));
			searchFolders.push(path.join(appRoot, 'controllers', this.platform));
		}

		for (const folder of searchFolders) {
			const pathMapping: IPathMapping = {
				'/': folder
			};
			const mappedPath = await chromeUtils.targetUrlToClientPath(sourceUrl, pathMapping);

			if (mappedPath) {
				defaultPath = mappedPath;
				break;
			}
		}

		return defaultPath;
	}

	public async stackTraceResponse (response: IStackTraceResponseBody): Promise<void> {
		await Promise.all(response.stackFrames.map(frame => frame && frame.source && this.fixSource(frame.source)));
	}

	public getClientPathFromTargetPath (targetPath: string): string {
		return this._targetUrlToLocalPath.get(targetPath) || targetPath;
	}

	public async fixSource (source: DebugProtocol.Source): Promise<void> {
		if (source && source.path) {

			const clientPath = this._targetUrlToLocalPath.get(source.path)
				|| await chromeUtils.targetUrlToClientPath(source.path, this._pathMapping);

			if (clientPath) {
				source.path = clientPath;
				source.sourceReference = undefined;
				source.origin = undefined;
				source.name = path.basename(clientPath);
			}
		}
	}
}
