import { strict as assert } from 'assert';
import { AddressInfo } from 'net';
import { WebSocket, WebSocketServer } from 'ws';
import { CDPConnection } from '../../../debugger/next/v8/cdpConnection';

interface CDPRequest {
	id: number;
	method: string;
	params?: object;
}

describe('CDPConnection', () => {
	let server: WebSocketServer;
	let acceptedConnections: WebSocket[] = [];
	let url: string;

	beforeEach(async () => {
		acceptedConnections = [];
		await new Promise<void>(resolve => {
			server = new WebSocketServer({ port: 0 }, () => resolve());
		});
		server.on('connection', ws => acceptedConnections.push(ws));
		const port = (server.address() as AddressInfo).port;
		url = `ws://localhost:${port}`;
	});

	afterEach(async () => {
		for (const ws of acceptedConnections) {
			ws.terminate();
		}
		await new Promise<void>(resolve => server.close(() => resolve()));
	});

	async function waitForServerConnection(): Promise<WebSocket> {
		if (acceptedConnections.length > 0) {
			return acceptedConnections[0];
		}
		return new Promise(resolve => server.once('connection', ws => resolve(ws)));
	}

	function autoRespond(ws: WebSocket, build: (req: CDPRequest) => object): void {
		ws.on('message', raw => {
			const req: CDPRequest = JSON.parse(raw.toString());
			ws.send(JSON.stringify(build(req)));
		});
	}

	it('resolves send() with the result of a matching response', async () => {
		const conn = new CDPConnection(url);
		const serverWsPromise = waitForServerConnection();
		await conn.connect();
		const sws = await serverWsPromise;
		autoRespond(sws, req => ({ id: req.id, result: { ok: true, method: req.method } }));

		const result = await conn.send<{ ok: boolean; method: string }>('Runtime.enable');
		assert.deepEqual(result, { ok: true, method: 'Runtime.enable' });

		conn.disconnect();
	});

	it('rejects send() with the method name in the error message on error response', async () => {
		const conn = new CDPConnection(url);
		const serverWsPromise = waitForServerConnection();
		await conn.connect();
		const sws = await serverWsPromise;
		autoRespond(sws, req => ({ id: req.id, error: { code: -32601, message: 'unknown method' } }));

		await assert.rejects(
			() => conn.send('Made.Up.Method'),
			(err: Error) => err.message === 'Made.Up.Method: unknown method',
		);

		conn.disconnect();
	});

	it('emits CDP events (messages without an id) by method name with params', async () => {
		const conn = new CDPConnection(url);
		const serverWsPromise = waitForServerConnection();
		await conn.connect();
		const sws = await serverWsPromise;

		const received = new Promise<object>(resolve => {
			conn.on('Debugger.paused', params => resolve(params as object));
		});
		sws.send(JSON.stringify({ method: 'Debugger.paused', params: { reason: 'other' } }));

		assert.deepEqual(await received, { reason: 'other' });
		conn.disconnect();
	});

	it('rejects all pending sends when the connection closes server-side', async () => {
		const conn = new CDPConnection(url);
		const serverWsPromise = waitForServerConnection();
		await conn.connect();
		const sws = await serverWsPromise;

		// Don't respond; just close after the request lands.
		sws.on('message', () => sws.close());

		await assert.rejects(
			() => conn.send('Runtime.enable'),
			(err: Error) => /closed/.test(err.message),
		);
	});

	it('matches concurrent send() calls to their respective responses', async () => {
		const conn = new CDPConnection(url);
		const serverWsPromise = waitForServerConnection();
		await conn.connect();
		const sws = await serverWsPromise;
		autoRespond(sws, req => ({ id: req.id, result: { echo: req.method } }));

		const results = await Promise.all([
			conn.send<{ echo: string }>('A'),
			conn.send<{ echo: string }>('B'),
			conn.send<{ echo: string }>('C'),
		]);

		assert.deepEqual(results.map(r => r.echo), [ 'A', 'B', 'C' ]);
		conn.disconnect();
	});

	it('rejects send() if called before connect()', async () => {
		const conn = new CDPConnection(url);
		await assert.rejects(
			() => conn.send('Runtime.enable'),
			(err: Error) => /not open/.test(err.message),
		);
	});

	it('rejects connect() with a timeout when the server never opens the socket', async () => {
		// Close the WS server so the port goes dead; ws will reject quickly with ECONNREFUSED.
		// To force a true timeout we point at a non-routable address that hangs.
		const conn = new CDPConnection('ws://10.255.255.1:9999');
		await assert.rejects(
			() => conn.connect(100),
			(err: Error) => /timed out/i.test(err.message) || /ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/.test(err.message),
		);
	});

	it('rejects connect() if called twice on the same instance', async () => {
		const conn = new CDPConnection(url);
		await conn.connect();
		await assert.rejects(
			() => conn.connect(),
			(err: Error) => /twice/.test(err.message),
		);
		conn.disconnect();
	});

	it('does not crash on malformed JSON frames', async () => {
		const conn = new CDPConnection(url);
		const serverWsPromise = waitForServerConnection();
		await conn.connect();
		const sws = await serverWsPromise;

		// Suppress the console.warn the connection emits for the bad frame.
		const originalWarn = console.warn;
		console.warn = () => { /* noop */ };
		try {
			sws.send('not json {');
			// Then send a proper response to a real request to confirm the connection still works.
			autoRespond(sws, req => ({ id: req.id, result: { ok: true } }));
			const result = await conn.send<{ ok: boolean }>('Runtime.enable');
			assert.deepEqual(result, { ok: true });
		} finally {
			console.warn = originalWarn;
			conn.disconnect();
		}
	});
});
