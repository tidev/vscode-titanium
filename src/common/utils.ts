import * as fs from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';

export async function determineProjectType (projectDirectory: string) {
	if (await fs.pathExists(path.join(projectDirectory, 'app'))) {
		return 'alloy';
	} else {
		return 'classic';
	}
}

export async function getAppName (projectDirectory: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const tiappPath = path.join(projectDirectory, 'tiapp.xml');
			const fileData = fs.readFileSync(tiappPath, 'utf-8');
			const parser = new xml2js.Parser();
			parser.parseString(fileData, (err, result) => {
				if (!err) {
					return resolve(result['ti:app'].name[0]);
				}
			});
		} catch (error) {
			return reject(error);
		}
	});

}
