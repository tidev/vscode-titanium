import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseSourceMapTransformer } from 'vscode-chrome-debug-core';
import { TitaniumAttachRequestArgs, TitaniumLaunchRequestArgs } from '../common/extensionProtocol';
import { determineProjectType } from '../common/utils';

export class TitaniumSourceMapTransformer extends BaseSourceMapTransformer {

	private appDirectory: string;
	private platform: string;
	private projectType: string;

	public async attach (args: TitaniumAttachRequestArgs) {
		await this.configureOptions(args);
		return super.attach(args);
	}

	public async launch (args: TitaniumLaunchRequestArgs) {
		await this.configureOptions(args);
		return super.attach(args);
	}

	public async configureOptions (args: TitaniumLaunchRequestArgs) {
		this.appDirectory = args.appRoot;
		this.platform = args.platform === 'ios' ? 'iphone' : args.platform;
		this.projectType = await determineProjectType(this.appDirectory);
	}

	public async scriptParsed (pathToGenerated: string, sourceMapUrl: string): Promise<string[]> {
		if (this.projectType === 'alloy') {
			const mapDir = path.join(this.appDirectory, 'build', 'map', 'Resources', this.platform);
			const libDir = path.join(this.appDirectory, 'app', 'lib');
			const filename = path.basename(pathToGenerated);
			const relative = path.relative(path.join(this.appDirectory, 'app'), pathToGenerated);
			const dir = path.dirname(relative);
			const isLib = pathToGenerated.includes(libDir);
			// if its under lib then its at the top level
			if (filename === 'alloy.js' || filename === 'app.js') {
				sourceMapUrl = path.join(mapDir, 'app.js.map');
			} else if (isLib) {
				const filepath = path.relative(libDir, pathToGenerated);
				sourceMapUrl = path.join(mapDir, `${filepath}.map`);
			} else {
				const overridePath = path.join(mapDir, 'alloy', dir, `${filename}.map`);
				if (await fs.pathExists(overridePath)) {
					sourceMapUrl = overridePath;
				}
			}

		}
		return await super.scriptParsed(pathToGenerated, sourceMapUrl);
	}
}
