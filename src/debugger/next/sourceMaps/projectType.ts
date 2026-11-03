import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectType } from './types';

export async function detectProjectType(projectRoot: string): Promise<ProjectType> {
	try {
		await fs.access(path.join(projectRoot, 'app', 'alloy.js'));
		return 'alloy';
	} catch {
		return 'classic';
	}
}
