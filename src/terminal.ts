import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import * as vscode from 'vscode';
import { ProgressLocation, ProgressOptions, Terminal as VSTerminal, window } from 'vscode';
import { GlobalState } from './constants';
import { ExtensionContainer } from './container';

export default class Terminal {

	private name: string;
	private terminal: VSTerminal;
	private command: string;
	private proc: ChildProcess;
	private channel: vscode.OutputChannel;

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

	public runCommand (args: string[], { forceTerminal = false } = {} ) {
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

	public executeCommand (command: string) {
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

	// TODO: refactor this and the above command
	public runInBackground (command: string, args: string[], spawnOptions: SpawnOptions = { shell: true }) {
		return new Promise((resolve, reject) => {
			const proc = spawn(command, args, spawnOptions);

			proc.on('close', code => {
				if (code) {
					return reject();
				}
				return resolve();
			});
		});
	}

	public runCommandInOutput (args: string[], cwd?: string) {
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
		this.proc.stdout.on('data', data => {
			ExtensionContainer.context.globalState.update(GlobalState.Running, true);
			vscode.commands.executeCommand('setContext', GlobalState.Running, true);
			const message = data.toString();
			this.channel.append(message);
		});
		this.proc.stderr.on('data', data => {
			const message = data.toString();
			this.channel.append(message);
		});
		this.proc.on('close', data => {
			this.proc = null;
		});
		this.proc.on('exit', data => {
			ExtensionContainer.context.globalState.update(GlobalState.Running, false);
			vscode.commands.executeCommand('setContext', GlobalState.Running, false);
			this.proc = null;
		});

		this.channel.show();
		return this.proc;
	}

	public clear () {
		this.terminal.sendText('clear');
	}

	public stop () {
		if (this.proc) {
			this.proc.kill();
			this.proc = null;
		}
	}

	public showOutput () {
		if (this.channel) {
			this.channel.show();
		}
	}
}
