import * as vscode from 'vscode';
import { CommandTaskProvider } from './commandTaskProvider';
import { TaskExecutionContext } from './tasksHelper';
import { AppBuildTask } from './buildTaskProvider';
import * as cp from 'child_process';

type StdListeners = (content: string) => void;

async function spawnCommand (command: string, options: cp.SpawnOptions, onStdout: StdListeners, onStderr: StdListeners, token?: vscode.CancellationToken): Promise<void> {
	return new Promise((resolve, reject) => {
		let cancellationListener: vscode.Disposable;
		options = options || {};
		options.shell = true;

		const process = cp.spawn(command, [], options);

		process.stdout.on('data', (data: Buffer) => {
			onStdout(data.toString());
		});

		process.stderr.on('data', (data: Buffer) => {
			onStderr(data.toString());
		});

		process.on('close', (code, signal) => {
			if (cancellationListener) {
				cancellationListener.dispose();
			}

			if (token && token.isCancellationRequested) {
				return reject(new Error('user cancelled'));
			} else if (code) {
				// throw nice error
				return reject(new Error('problem running command'));
			}
			return resolve();
		});

		if (token) {
			cancellationListener = token.onCancellationRequested(() => {
				process.kill();
			});
		}
	});
}

export class TaskPseudoTerminal implements vscode.Pseudoterminal {
	private readonly closeEmitter: vscode.EventEmitter<number> = new vscode.EventEmitter<number>();
	private readonly cts: vscode.CancellationTokenSource = new vscode.CancellationTokenSource();
	private readonly task: vscode.Task;
	private readonly taskProvider: CommandTaskProvider;
	private readonly writeEmitter: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();

	public readonly onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	public readonly onDidClose: vscode.Event<number> = this.closeEmitter.event;

	public constructor (taskProvider: CommandTaskProvider, task: AppBuildTask) {
		this.taskProvider = taskProvider;
		this.task = task;
	}

	public open (initialDimensions: vscode.TerminalDimensions | undefined): void {
		const folder = this.task.scope === vscode.TaskScope.Workspace
			? vscode.workspace.workspaceFolders![0]
			: this.task.scope as vscode.WorkspaceFolder;

		const executionContext: TaskExecutionContext = {
			cancellationToken: this.cts.token,
			folder,
			terminal: this,
		};

		this.taskProvider.executeTask(executionContext, this.task);
	}

	public close (code?: number): void {
		this.cts.cancel();
		this.closeEmitter.fire(code || 0);
	}

	public async executeCommand (command: string, folder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<void> {

		this.write(`${command} \r\n\r\n`);

		await spawnCommand(
			command,
			{ cwd: folder.uri.fsPath },
			(stdout: string) => {
				this.write(stdout);
			},
			(stderr: string) => {
				this.write(stderr);
			},
			token
		);
	}

	private write (message: string): void {
		message = message.replace(/\r?\n/g, '\r\n');
		this.writeEmitter.fire(`\x1b[0m${message}\x1b[0m`);
	}
}
