import { ExtensionContext } from 'vscode';
import appc from './appc';
import Terminal from './terminal';

export class ExtensionContainer {
	private static _appc;
	private static _context: ExtensionContext;
	private static _terminal: Terminal;
	public static inititalize (context: ExtensionContext) {
		this._appc = appc;
		this._context = context;
	}

	static get appc () {
		return this._appc;
	}

	static get context () {
		return this._context;
	}

	static get terminal () {
		if (this._terminal === undefined) {
			this._terminal = new Terminal('Appcelerator');
		}
		return this._terminal;
	}

	// static get
}
