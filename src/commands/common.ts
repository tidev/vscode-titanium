import { commands, Disposable, TextEditor, Uri } from 'vscode';
import { CommandContext } from '../constants';
import { BaseNode } from '../explorer/nodes';

export enum Commands {
	GenerateAlloyController = 'titanium.alloy.generate.controller',

	BuildApp = 'titanium.build.run',
}

export interface CommandContextParsingOptions {
	editor: boolean;
	uri: boolean;
}

function isTextEditor (editor: any): editor is TextEditor {
	if (editor === null)  {
		return false;
	}

	return (
		editor.id !== undefined &&
		((editor as TextEditor).edit !== undefined || (editor as TextEditor).document !== undefined)
	);
}

export class UserCancellation extends Error {
	constructor () {
		super('User cancelled');
	}
}

export abstract class Command implements Disposable {

	protected readonly contextParsingOptions: CommandContextParsingOptions = { editor: false, uri: false };
	private _disposable: Disposable;

	constructor (command: Commands | Commands[]) {
		if (typeof command === 'string') {
			this._disposable = commands.registerCommand(
				command,
				(...args: any[]) => this._execute(command, ...args),
				this
			);
			return;
		}
	}

	private static parseCommandContext (command: string, options: any, ...args: any[]) {
		let editor: TextEditor | undefined;

		let firstArg = args[0];
		if (options.editor && (firstArg === null || isTextEditor(firstArg))) {
			editor = firstArg;
			args = args.slice(1);
			firstArg = args[0];
		}

		if (options.uri && (firstArg === null || firstArg instanceof Uri)) {
			const [uri, ...rest] = args as [Uri, any];
			if (uri !== undefined) {
				return [{ command, type: 'uri', editor, uri }, ...rest];
			} else {
				args = args.slice(1);
			}
		}

		if (firstArg instanceof BaseNode) {
			const [node, ...rest] = args as [BaseNode, any];
			return [{ command, type: 'viewItem', node }, rest];
		}

		return [{ command, type: 'unknown', editor }, args];
	}

	public dispose () {
		if (this._disposable) {
			this._disposable.dispose();
		}
	}

	public abstract execute (...args: any[]): any;

	protected async preExecute (context: any, ...args: any[]): Promise<any> {
		return this.execute(...args);
	}

	protected _execute (command: string, ...args: any[]): any {
		// Telemetry.trackEvent(command);

		const [context, rest] = Command.parseCommandContext(command, { ...this.contextParsingOptions }, ...args);
		return this.preExecute(context, ...rest);
	}

}
