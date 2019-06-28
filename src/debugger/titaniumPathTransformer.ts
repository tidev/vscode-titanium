import * as fs from 'fs-extra';
import * as path from 'path';
import { BasePathTransformer, chromeUtils, IPathMapping, ISetBreakpointsArgs, IStackTraceResponseBody, utils } from 'vscode-chrome-debug-core';
import { DebugProtocol } from 'vscode-debugprotocol';
import { determineProjectType, getAppName } from '../common/utils';
import { TitaniumAttachRequestArgs, TitaniumLaunchRequestArgs } from './titaniumDebugAdapter';

export class TitaniumPathTransformer extends BasePathTransformer {

	private appDirectory: string;
	private platform: string;
	private _pathMapping: IPathMapping;
	private _localPathToTargetUrl = new Map<string, string>();
	private _targetUrlToLocalPath = new Map<string, string>();
	private projectType: string;
	private appName: string;

	public async attach (args: TitaniumAttachRequestArgs) {
		await this.configureTransformOptions(args);
		return super.attach(args);
	}

	public async launch (args: TitaniumLaunchRequestArgs) {
		await this.configureTransformOptions(args);
		return super.attach(args);
	}

	public async configureTransformOptions (args: TitaniumAttachRequestArgs|TitaniumLaunchRequestArgs) {
		this._pathMapping = args.pathMapping;
		this.appDirectory = args.appRoot;
		this.platform = args.platform === 'ios' ? 'iphone' : args.platform;
		this.projectType = await determineProjectType(this.appDirectory);
		this.appName = await getAppName(this.appDirectory);
	}

	public setBreakpoints (args: ISetBreakpointsArgs): ISetBreakpointsArgs {
		if (!args.source.path) {
			// sourceReference script, nothing to do
			return args;
		}

		if (utils.isURL(args.source.path)) {
			// already a url, use as-is
			return args;
		}

		const canonicalPath = utils.canonicalizeUrl(args.source.path);
		const url = this.getTargetPathFromClientPath(canonicalPath);
		if (url) {
			args.source.path = url;
			return args;
		} else {
			args.source.path = canonicalPath;
			return args;
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
		// If it's already a URL, skip the Map
		return path.isAbsolute(clientPath) ?
			this._localPathToTargetUrl.get(utils.canonicalizeUrl(clientPath)) :
			clientPath;
	}

	public async getLocalPath (sourceUrl: string): Promise<string> {
		const appRoot = this.projectType === 'alloy' ? path.join(this.appDirectory, 'app') : path.join(this.appDirectory, 'Resources');
		const platformAppRoot = path.join(this.appDirectory, 'Resources', this.platform);
		const platformRoot = path.join(appRoot, this.platform);
		let defaultPath = '';
		const searchFolders = [ appRoot ];

		if (this.platform === 'iphone') {
			try {
				const appName = `${this.appName}.app`;
				sourceUrl = sourceUrl.split(appName)[1];
			} catch (error) {
				throw error;
			}

		}

		if (this.projectType !== 'alloy') {
			searchFolders.push(platformRoot);
		}

		if (this.projectType === 'alloy') {
			searchFolders.push(path.join(appRoot, 'lib'));
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

		if (defaultPath.toLowerCase().includes(appRoot.toLowerCase())) {
			const relative = path.relative(appRoot, defaultPath);
			const platformPath = path.join(platformRoot, relative);
			if (await fs.pathExists(platformPath)) {
				defaultPath = platformPath;
			}
		}

		return defaultPath;
	}

	public async stackTraceResponse (response: IStackTraceResponseBody): Promise<void> {
		await Promise.all(response.stackFrames.map(frame => this.fixSource(frame.source)));
	}

	public getClientPathFromTargetPath (targetPath: string): string {
		return this._targetUrlToLocalPath.get(targetPath);
	}

	public async fixSource (source: DebugProtocol.Source): Promise<void> {
		if (source && source.path) {

			const clientPath = this.getClientPathFromTargetPath(source.path) ||
				await this.targetUrlToClientPath(source.path);

			if (clientPath) {
				source.path = clientPath;
				source.sourceReference = undefined;
				source.origin = undefined;
				source.name = path.basename(clientPath);
			}
		}
	}

	protected async targetUrlToClientPath (scriptUrl: string): Promise<string> {
		return Promise.resolve(chromeUtils.targetUrlToClientPath(scriptUrl, this._pathMapping));
	}
}
