import * as path from 'path';

/**
 * Returns the path to the fixtures directory
 *
 * @returns {String}
 */
export function getCommonFixturesDirectory (): string {
	return path.join(__dirname, '../../..', 'src', 'test', 'common', 'fixtures');
}

/**
 * Returns the path to the alloy project directory
 *
 * @returns {String}
 */
export function getCommonAlloyProjectDirectory (): string {
	return path.join(getCommonFixturesDirectory(), 'alloy-project');
}
