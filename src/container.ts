import { ExtensionContext } from 'vscode';
import appc, { Appc } from './appc';
import { Config, configuration } from './configuration';
import Terminal from './terminal';

export class ExtensionContainer {
	private static _appc: Appc;
	private static _config: Config | undefined;
	private static _context: ExtensionContext;
	private static _terminal: Terminal;

	public static inititalize (context: ExtensionContext, config: Config): void {
		this._appc = appc;
		this._config = config;
		this._context = context;
	}

	static get appc (): Appc {
		return this._appc;
	}

	static get config (): Config {
		if (this._config === undefined) {
			this._config = configuration.get<Config>();
		}
		return this._config;
	}

	static get context (): ExtensionContext {
		return this._context;
	}

	static get terminal (): Terminal {
		if (this._terminal === undefined) {
			this._terminal = new Terminal('Appcelerator');
		}
		return this._terminal;
	}

	public static resetConfig (): void {
		this._config = undefined;
	}
}
