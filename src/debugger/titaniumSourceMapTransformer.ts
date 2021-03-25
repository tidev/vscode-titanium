import { BaseSourceMapTransformer } from 'vscode-chrome-debug-core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TitaniumAttachRequestArgs, TitaniumLaunchRequestArgs } from '../common/extensionProtocol';
import { determineProjectType } from '../common/utils';

export class TitaniumSourceMapTransformer extends BaseSourceMapTransformer {

	private appDirectory!: string;
	private platform!: string;
	private projectType!: string;

	public async attach (args: TitaniumAttachRequestArgs): Promise<void> {
		await this.configureOptions(args.projectDir, args.platform);
		return super.attach(args);
	}

	public async launch (args: TitaniumLaunchRequestArgs): Promise<void> {
		await this.configureOptions(args.projectDir, args.platform);
		return super.attach(args);
	}

	public async configureOptions (projectDir: string, platform: string): Promise<void> {
		this.appDirectory = projectDir;
		this.platform = platform;
		this.projectType = await determineProjectType(this.appDirectory);
	}

	public async scriptParsed (pathToGenerated: string, originalUrlToGenerated: string|undefined, sourceMapUrl: string): Promise<string[]> {
		if (this.projectType === 'alloy') {
			const sourceMapPlatform = this.platform === 'ios' ? 'iphone' : this.platform;
			const mapDir = path.join(this.appDirectory, 'build', 'map', 'Resources', sourceMapPlatform);
			const libDir = path.join(this.appDirectory, 'app', 'lib');
			const filename = path.basename(pathToGenerated);
			const relative = path.relative(path.join(this.appDirectory, 'app'), pathToGenerated);
			const isLib = pathToGenerated.includes(libDir);
			// if its under lib then its at the top level
			if (filename === 'alloy.js' || filename === 'app.js') {
				sourceMapUrl = path.join(mapDir, 'app.js.map');
			} else if (isLib) {
				const filepath = path.relative(libDir, pathToGenerated);
				sourceMapUrl = path.join(mapDir, `${filepath}.map`);
			} else {
				let dir = path.dirname(relative);
				dir = dir.split(path.sep).filter(e => e !== this.platform).join(path.sep);
				const overridePath = path.join(mapDir, 'alloy', dir, `${filename}.map`);
				if (await fs.pathExists(overridePath)) {
					sourceMapUrl = overridePath;
				}
			}

		}
		return await super.scriptParsed(pathToGenerated, originalUrlToGenerated, sourceMapUrl);
	}
}
