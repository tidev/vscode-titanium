import { strict as assert } from 'assert';
import type * as vscode from 'vscode';
import { DiagnosticsGate } from '../../../diagnosticsGate';

/**
 * A stand-in for a URI, which is all the gate needs of one: a string form to key on
 *
 * @param {string} path - The file
 * @returns {vscode.Uri} The URI
 */
const uri = (path: string): vscode.Uri => ({ toString: () => `file://${path}` }) as vscode.Uri;

/**
 * A stand-in for a diagnostic, which the gate never looks inside
 *
 * @param {string} message - What it says
 * @returns {vscode.Diagnostic} The diagnostic
 */
const diagnostic = (message: string): vscode.Diagnostic => ({ message }) as vscode.Diagnostic;

describe('the diagnostics gate', () => {
	let shown: boolean;
	let gate: DiagnosticsGate;
	let passed: [ string, string[] ][];
	const next = (target: vscode.Uri, diagnostics: vscode.Diagnostic[]): number => passed.push([ target.toString(), diagnostics.map(each => each.message) ]);

	beforeEach(() => {
		shown = true;
		gate = new DiagnosticsGate(() => shown);
		passed = [];
	});

	it('passes the server\'s diagnostics on while they are shown', () => {
		gate.handle(uri('/a.xml'), [ diagnostic('colr') ], next);

		assert.deepEqual(passed, [ [ 'file:///a.xml', [ 'colr' ] ] ]);
	});

	it('passes nothing on while they are hidden', () => {
		shown = false;

		gate.handle(uri('/a.xml'), [ diagnostic('colr') ], next);

		assert.deepEqual(passed, [ [ 'file:///a.xml', [] ] ]);
	});

	it('hides what is already shown, and shows it again, without waiting for the server', () => {
		// the server only publishes when a file changes, so what it said last is all there is
		gate.handle(uri('/a.xml'), [ diagnostic('colr') ], next);
		gate.handle(uri('/b.tss'), [ diagnostic('widht') ], next);
		passed = [];

		shown = false;
		gate.reapply(next);
		shown = true;
		gate.reapply(next);

		assert.deepEqual(passed, [
			[ 'file:///a.xml', [] ],
			[ 'file:///b.tss', [] ],
			[ 'file:///a.xml', [ 'colr' ] ],
			[ 'file:///b.tss', [ 'widht' ] ]
		]);
	});

	it('forgets a file once the server has nothing to say about it', () => {
		gate.handle(uri('/a.xml'), [ diagnostic('colr') ], next);
		gate.handle(uri('/a.xml'), [], next);
		passed = [];

		gate.reapply(next);

		assert.deepEqual(passed, []);
	});
});
