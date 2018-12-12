import { spawn, SpawnOptions } from 'child_process';
import { ProgressLocation, ProgressOptions, Terminal as VSTerminal, window } from 'vscode';

export default class Terminal {

	private name: string;
	private terminal: VSTerminal;
	private command: string;

	constructor (name: string, command: string = 'appc' ) {

		this.name = name;
		this.terminal = window.createTerminal({ name });
		window.onDidCloseTerminal(e => {
			if (e.name === this.name) {
				this.terminal = undefined;
			}
		});
		this.command = command;
	}

	public setCommandPath (commandPath) {
		this.command = commandPath;
	}

	public runCommand (args: string[]) {
		if (!this.terminal) {
			this.terminal = window.createTerminal({ name: this.name });
		}

		const activeTerminal = window.activeTerminal;
		// Only call show if we arent the active terminal
		if (!activeTerminal || activeTerminal.name !== this.terminal.name) {
			this.terminal.show();
		}
		this.clear();
		this.terminal.sendText(`${this.command} ${args.join(' ')}`);
	}

	public runCommandInBackground (args: string[], progressOptions: ProgressOptions = { location: ProgressLocation.Window }, spawnOptions: SpawnOptions = { shell: true }) {
		return window.withProgress(progressOptions, () => {
			return new Promise((resolve, reject) => {
				const proc = spawn(this.command, args, spawnOptions);

				proc.on('close', code => {
					if (code) {
						return reject();
					}
					return resolve();
				});
			});
		});

	}

	public clear () {
		this.terminal.sendText('clear');
	}

}
