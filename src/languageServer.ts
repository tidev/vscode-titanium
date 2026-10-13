import * as vscode from 'vscode';
import { DocumentSelector, LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

/**
 * The files the server answers for. It decides from the project layout what a file is to
 * Titanium, so every file of these languages is sent and the server ignores what is not part of a
 * project: a .js is a controller under app/controllers and plain JavaScript elsewhere, and an .xml
 * is a view, tiapp.xml or strings.xml by where it sits.
 */
export const documentSelector: DocumentSelector = [
	{ scheme: 'file', language: 'javascript' },
	{ scheme: 'file', language: 'typescript' },
	{ scheme: 'file', language: 'xml' },
	{ scheme: 'file', language: 'alloy-tss' }
];

/**
 * The server's entry point, resolved without loading it: the package is ESM and the extension is
 * not, and require.resolve finds the file either way.
 *
 * @returns {string} The absolute path to the server module
 */
export function serverModule (): string {
	return require.resolve('titanium-language-server/server');
}

/**
 * Starts the language server and waits for it to answer initialize. The client is disposed with
 * the extension, which stops the server.
 *
 * @param {vscode.ExtensionContext} context - The extension context
 * @returns {Promise<LanguageClient>} The running client
 */
export async function startLanguageServer (context: vscode.ExtensionContext): Promise<LanguageClient> {
	const module = serverModule();
	const serverOptions: ServerOptions = {
		run: { module, transport: TransportKind.stdio },
		debug: { module, transport: TransportKind.stdio, options: { execArgv: [ '--inspect=6009' ] } }
	};
	const clientOptions: LanguageClientOptions = { documentSelector };

	const client = new LanguageClient('titanium', 'Titanium Language Server', serverOptions, clientOptions);
	context.subscriptions.push(client);
	await client.start();
	return client;
}
