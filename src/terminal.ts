import { spawn, SpawnOptions } from 'child_process';
import { l10n, Terminal as VSTerminal, window } from 'vscode';
import { CommandError, CommandResponse } from './common/utils';

export default class Terminal {

	private name: string;
	private terminal: VSTerminal|undefined;
	private command: string;

	constructor (name: string, command = 'ti') {

		this.name = name;
		this.terminal = window.createTerminal({ name });
		window.onDidCloseTerminal(e => {
			if (e.name === this.name) {
				this.terminal = undefined;
			}
		});
		this.command = command;
	}

	public runCommand (args: string[]): void {
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

	public runInBackground (command: string, args: string[], spawnOptions: SpawnOptions = { shell: true }): Promise<CommandResponse> {
		if (!spawnOptions.shell) {
			spawnOptions.shell = true;
		}
		return new Promise((resolve, reject) => {
			const proc = spawn(`"${command}"`, args, spawnOptions);
			let output = ';';
			proc.stdout?.on('data', data => {
				output += data.toString();
			});

			proc.stderr?.on('data', data => {
				data = data.toString();
				output += data.toString();
				// If we're prompted for some info, error out
				if (data.match(/Enter .+:/)) {
					proc.kill(1);
				}
			});

			proc.on('close', code => {
				if (code) {
					const error = new CommandError(l10n.t('Failed to run command'), `${command} ${args.join(' ')}`, code, output);
					return reject(error);
				}
				return resolve({ output });
			});
		});
	}

	public clear (): void {
		if (this.terminal) {
			this.terminal.sendText('clear');
		}
	}
}
