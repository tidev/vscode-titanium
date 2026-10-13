import { execFileSync } from 'child_process';
import * as path from 'path';
import { strict as assert } from 'assert';

const repoRoot = path.resolve(__dirname, '../../../..');

describe('the packaged language server', function () {
	// vsce compiles before it lists, so this takes as long as a build
	this.timeout(180000);

	let packaged: string[];

	before(() => {
		const vsce = path.join(repoRoot, 'node_modules', '@vscode', 'vsce', 'vsce');
		const output = execFileSync(process.execPath, [ vsce, 'ls' ], { cwd: repoRoot, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] });
		packaged = output.split(/\r?\n/).map(line => line.trim().replace(/\\/g, '/'));
	});

	it('ships the server the client starts', () => {
		assert.ok(packaged.some(file => /titanium-language-server\/out\/server\.js$/.test(file)));
	});

	it('ships the declarations the server reads at run time, which .vscodeignore drops with every other .ts', () => {
		// the server gives Alloy's globals their types from this file
		assert.ok(packaged.some(file => /titanium-language-server\/assets\/alloy\.d\.ts$/.test(file)), 'expected assets/alloy.d.ts');
		// and TypeScript cannot type a single line of JavaScript without its standard library
		assert.ok(packaged.some(file => /typescript\/lib\/lib\.es5\.d\.ts$/.test(file)), 'expected typescript/lib/lib.es5.d.ts');
	});
});
