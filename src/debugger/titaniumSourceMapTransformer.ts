import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseSourceMapTransformer } from 'vscode-chrome-debug-core';
import { TitaniumLaunchRequestArgs } from './titaniumDebugAdapter';

export class TitaniumSourceMapTransformer extends BaseSourceMapTransformer {

	private appDirectory: string;
	private platform: string;
	private projectType: string;

	public configureOptions (args: TitaniumLaunchRequestArgs, projectType: string) {
		this.appDirectory = args.appRoot;
		this.platform = args.platform;
		this.projectType = projectType;
	}

	public async scriptParsed (pathToGenerated: string, sourceMapUrl: string): Promise<string[]> {
		if (this.projectType === 'alloy') {
			const mapDir = path.join(this.appDirectory, 'build', 'map', 'Resources', this.platform);
			const filename = path.basename(pathToGenerated);
			const relative = path.relative(path.join(this.appDirectory, 'app'), pathToGenerated);
			const dir = path.dirname(relative);
			if (filename === 'alloy.js' || filename === 'app.js') {
				sourceMapUrl = path.join(mapDir, 'app.js.map');
			} else {
				const overridePath = path.join(mapDir, 'alloy', dir, `${filename}.map`);
				if (await fs.pathExists(overridePath)) {
					sourceMapUrl = overridePath;
				}
			}

		}
		const scriptParsedResult = await super.scriptParsed(pathToGenerated, sourceMapUrl);
		return scriptParsedResult;
	}
}
