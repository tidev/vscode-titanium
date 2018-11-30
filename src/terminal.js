const { window } = require('vscode');

class Terminal {

	constructor({ name, commandPath = 'appc' }) {

		this.name = name;
		this.terminal = window.createTerminal({ name });
		window.onDidCloseTerminal((e) => {
			if (e.name === this.name) {
				this.terminal = undefined;
			}
		});
		this.commandPath = commandPath;
	}

	setCommandPath(commandPath) {
		this.commandPath = commandPath;
	}

	runCommand({ args }) {
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

	clear() {
		this.terminal.sendText('clear');
	}

}

module.exports = Terminal;
