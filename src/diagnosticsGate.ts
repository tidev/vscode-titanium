import type * as vscode from 'vscode';

/** Where diagnostics go once they are through the gate: the client's own handler, or its collection */
export type DiagnosticsSink = (uri: vscode.Uri, diagnostics: vscode.Diagnostic[]) => unknown;

/**
 * Passes the language server's diagnostics on to the editor only while the setting allows.
 *
 * The server has no settings of its own, so turning its warnings off is done here, on the client.
 * What it published last is kept for each file, because it only publishes again when a file
 * changes: without it, turning the warnings back on would show nothing until the next edit.
 *
 * Only types come from `vscode`, so this runs, and is tested, outside the editor.
 */
export class DiagnosticsGate {

	private shown: () => boolean;
	private received = new Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>();

	/**
	 * @param {Function} shown - Whether diagnostics are shown, asked each time rather than once
	 */
	constructor (shown: () => boolean) {
		this.shown = shown;
	}

	/**
	 * Takes what the server published for a file, and passes it on or holds it back
	 *
	 * @param {vscode.Uri} uri - The file
	 * @param {vscode.Diagnostic[]} diagnostics - What the server published for it
	 * @param {DiagnosticsSink} next - Where it goes when it is shown
	 */
	public handle (uri: vscode.Uri, diagnostics: vscode.Diagnostic[], next: DiagnosticsSink): void {
		if (diagnostics.length) {
			this.received.set(uri.toString(), { uri, diagnostics });
		} else {
			this.received.delete(uri.toString());
		}

		next(uri, this.shown() ? diagnostics : []);
	}

	/**
	 * Shows or hides everything the server has published, after the setting has changed
	 *
	 * @param {DiagnosticsSink} sink - Where each file's diagnostics go
	 */
	public reapply (sink: DiagnosticsSink): void {
		const shown = this.shown();
		for (const { uri, diagnostics } of this.received.values()) {
			sink(uri, shown ? diagnostics : []);
		}
	}
}
