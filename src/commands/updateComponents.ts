import * as vscode from 'vscode';

export async function executeAsTask(command: string, name: string): Promise<void> {

	const task = new vscode.Task(
		{ type: 'shell' },
		name,
		'Updates',
		new vscode.ShellExecution(command)
	);

	const taskExecution = await vscode.tasks.executeTask(task);

	const taskEndPromise = new Promise<void>((resolve) => {
		const disposable = vscode.tasks.onDidEndTaskProcess(e => {
			if (e.execution === taskExecution) {
				disposable.dispose();
				resolve();
			}
		});
	});
	return taskEndPromise;
}
