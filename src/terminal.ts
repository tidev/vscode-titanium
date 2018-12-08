import { Terminal as VSTerminal, window, } from 'vscode';

export default class Terminal {

	private name: string;
	private terminal: VSTerminal;
	private commandPath: string;

	constructor ({ name, commandPath = 'appc' }) {

		this.name = name;
		this.terminal = window.createTerminal({ name });
		window.onDidCloseTerminal(e => {
			if (e.name === this.name) {
				this.terminal = undefined;
			}
		});
		this.commandPath = commandPath;
	}

	public setCommandPath (commandPath) {
		this.commandPath = commandPath;
	}

	public runCommand ({ args }) {
		if (!this.terminal) {
			this.terminal = window.createTerminal({ name: this.name });
		}

		const activeTerminal = window.activeTerminal;
		// Only call show if we arent the active terminal
		if (!activeTerminal || activeTerminal.name !== this.terminal.name) {
			this.terminal.show();
		}
		this.clear();
		this.terminal.sendText(`${this.commandPath} ${args.join(' ')}`);
	}

	public clear () {
		this.terminal.sendText('clear');
	}

}
