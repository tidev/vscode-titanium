const vscode = require('vscode');

class Terminal {

	constructor({ name, commandPath = 'appc' }) {

		this.terminal = vscode.window.createTerminal({ name });
		this.commandPath = commandPath;
	}

	setCommandPath(commandPath) {
		this.commandPath = commandPath;
	}

	runCommand({ args }) {
		const activeTerminal = vscode.window.activeTerminal;
		// Only call show if we arent the active terminal
		if (activeTerminal.name !== this.terminal.name) {
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
