import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { Terminal as VSTerminal, window, OutputChannel, commands } from 'vscode';
import { GlobalState } from './constants';
import { CommandError, CommandResponse } from './common/utils';
import { ExtensionContainer } from './container';

export default class Terminal {

	private name: string;
	private terminal: VSTerminal|undefined;
	private command: string;
	private proc: ChildProcess|undefined;
	private channel: OutputChannel|undefined;

	constructor (name: string, command = 'appc') {

		this.name = name;
		this.terminal = window.createTerminal({ name });
		window.onDidCloseTerminal(e => {
			if (e.name === this.name) {
				this.terminal = undefined;
			}
		});
		this.command = command;
	}

	public setCommandPath (commandPath: string): void {
		this.command = commandPath;
	}

	public runCommand (args: string[], { forceTerminal = false } = {}): void {
		if (ExtensionContainer.config.general.useTerminalForBuild || forceTerminal) {
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
		} else {
			this.runCommandInOutput(args);
		}
	}

	public executeCommand (command: string): void {
		if (!this.terminal) {
			this.terminal = window.createTerminal({ name: this.name });
		}
		const activeTerminal = window.activeTerminal;
		// Only call show if we arent the active terminal
		if (!activeTerminal || activeTerminal.name !== this.terminal.name) {
			this.terminal.show();
		}
		this.clear();
		this.terminal.sendText(command);

	}

	public runInBackground (command: string, args: string[], spawnOptions: SpawnOptions = { shell: true }): Promise<CommandResponse> {
		if (!spawnOptions.shell) {
			spawnOptions.shell = true;
		}
		return new Promise((resolve, reject) => {
			const proc = spawn(command, args, spawnOptions);
			let output = ';';
			proc.stdout?.on('data', data => {
				output += data.toString();
			});

			proc.stderr?.on('data', data => {
				output += data.toString();
			});

			proc.on('close', code => {
				if (code) {
					const error = new CommandError('Failed to run command', `${command} ${args}`, code, output);
					return reject(error);
				}
				return resolve({ output });
			});
		});
	}

	public runCommandInOutput (args: string[], cwd?: string): ChildProcess|undefined {
		if (this.proc) {
			window.showInformationMessage('A build is already in progress');
			return;
		}
		if (!this.channel) {
			this.channel = window.createOutputChannel('Appcelerator');
		}
		args.push('--no-prompt');
		this.channel.clear();
		this.channel.append(`${this.command} ${args.join(' ')}\n\n`);
		this.proc = spawn(this.command, args, { shell: true, cwd  });
		this.proc.stdout?.on('data', data => {
			ExtensionContainer.context.globalState.update(GlobalState.Running, true);
			commands.executeCommand('setContext', GlobalState.Running, true);
			const message = data.toString();
			this.channel?.append(message);
		});
		this.proc.stderr?.on('data', data => {
			const message = data.toString();
			this.channel?.append(message);
		});
		this.proc.on('close', () => {
			this.proc = undefined;
		});
		this.proc.on('exit', () => {
			ExtensionContainer.context.globalState.update(GlobalState.Running, false);
			commands.executeCommand('setContext', GlobalState.Running, false);
			this.proc = undefined;
		});

		this.channel.show();
		return this.proc;
	}

	public clear (): void {
		if (this.terminal) {
			this.terminal.sendText('clear');
		}
	}

	public stop (): void {
		if (this.proc) {
			this.proc.kill();
			this.proc = undefined;
		}
	}

	public showOutput (): void {
		if (this.channel) {
			this.channel.show();
		}
	}
}
