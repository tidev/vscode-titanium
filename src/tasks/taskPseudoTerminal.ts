import * as vscode from 'vscode';
import { CommandTaskProvider, TitaniumTaskBase } from './commandTaskProvider';
import { TaskExecutionContext, runningTasks } from './tasksHelper';
import * as cp from 'child_process';
import { ExtensionContainer } from '../container';
import { GlobalState } from '../constants';

type StdListeners = (content: string) => void;

export enum EscapeCodes {
	Default = '0m',
	Red = '31m',
	Yellow = '33m'
}

export class CommandError extends Error {
	public code = 'E_COMMAND_ERROR';
	public command: string;
	public exitCode: number;
	public signal: string;

	constructor(message: string, command: string, exitCode: number, signal: string) {
		super(message);
		this.command = command;
		this.exitCode = exitCode;
		this.signal = signal;
	}
}

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
				const error = new CommandError(`Process exited with ${code}`, command, code, signal);

				return reject(error);
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
	private readonly task: TitaniumTaskBase;
	private readonly taskProvider: CommandTaskProvider;
	private readonly writeEmitter: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();

	public readonly onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	public readonly onDidClose: vscode.Event<number> = this.closeEmitter.event;

	public constructor (taskProvider: CommandTaskProvider, task: TitaniumTaskBase) {
		this.taskProvider = taskProvider;
		this.task = task;
	}

	public open (): void {
		const folder = this.task.scope === vscode.TaskScope.Workspace
			? vscode.workspace.workspaceFolders![0]
			: this.task.scope as vscode.WorkspaceFolder;

		const executionContext: TaskExecutionContext = {
			cancellationToken: this.cts.token,
			folder,
			terminal: this,
			label: this.task.name,
			task: this.task
		};

		ExtensionContainer.context.globalState.update(GlobalState.Running, true);
		vscode.commands.executeCommand('setContext', GlobalState.Running, true);

		this.taskProvider.executeTask(executionContext, this.task).then((result) => this.close(result));
	}

	public close (code?: number): void {
		this.cts.cancel();
		this.closeEmitter.fire(code || 0);
		ExtensionContainer.context.globalState.update(GlobalState.Running, false);
		vscode.commands.executeCommand('setContext', GlobalState.Running, false);
		if (runningTasks.has(this.task.name)) {
			runningTasks.delete(this.task.name);
		}
	}

	public async executeCommand (command: string, folder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<void> {

		this.write(`${command} \r\n\r\n`);

		await spawnCommand(
			command,
			{ cwd: folder.uri.fsPath, env: { ...process.env, FORCE_COLOR: '1' } },
			(stdout: string) => {
				this.write(stdout);
			},
			(stderr: string) => {
				this.write(stderr);
			},
			token
		);
	}

	public writeLine (message: string): void {
		this.write(`${message}\r\n`);
	}

	public writeErrorLine(message: string): void {
		this.write(`${message}\r\n`, EscapeCodes.Red);
	}

	public writeWarningLine(message: string): void {
		this.write(`${message}\r\n`, EscapeCodes.Yellow);
	}

	public write (message: string, color = EscapeCodes.Default): void {
		message = message.replace(/\r?\n/g, '\r\n');
		this.writeEmitter.fire(`\x1b[${color}${message}\x1b[0m`);
	}
}
