import { ExtensionContext } from 'vscode';
import appc from './appc';
import { Config, configuration } from './configuration';
import Terminal from './terminal';

export class ExtensionContainer {
	private static _appc;
	private static _config: Config | undefined;
	private static _context: ExtensionContext;
	private static _terminal: Terminal;

	public static inititalize (context: ExtensionContext, config: Config) {
		this._appc = appc;
		this._config = config;
		this._context = context;
	}

	static get appc () {
		return this._appc;
	}

	static get config () {
		if (this._config === undefined) {
			this._config = configuration.get<Config>();
		}
		return this._config;
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

	public static resetConfig () {
		this._config = undefined;
	}
}
