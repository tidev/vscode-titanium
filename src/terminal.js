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
		// TODO: Once the October update for vscode ships update this to only
		// toggle if we arent the active terminal
		this.clear();
		this.terminal.show();
		this.terminal.sendText(`${this.commandPath} ${args.join(' ')}`);
	}

	clear() {
		this.terminal.sendText('clear');
	}

}

module.exports = Terminal;
