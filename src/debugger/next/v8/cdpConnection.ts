import { EventEmitter } from 'node:events';
import WebSocket from 'ws';

const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;

interface PendingRequest {
	method: string;
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

export class CDPConnection extends EventEmitter {

	private ws?: WebSocket;
	private nextId = 1;
	private readonly pending = new Map<number, PendingRequest>();
	private connectSettled = false;

	constructor(private readonly webSocketDebuggerUrl: string) {
		super();
	}

	connect(timeoutMs: number = DEFAULT_CONNECT_TIMEOUT_MS): Promise<void> {
		if (this.ws) {
			return Promise.reject(new Error('CDPConnection.connect() called twice on the same instance'));
		}

		return new Promise((resolve, reject) => {
			const ws = new WebSocket(this.webSocketDebuggerUrl);
			this.ws = ws;

			const timer = setTimeout(() => {
				if (this.connectSettled) {
					return;
				}
				this.connectSettled = true;
				ws.terminate();
				reject(new Error(`Connect timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			ws.on('open', () => {
				if (this.connectSettled) {
					return;
				}
				this.connectSettled = true;
				clearTimeout(timer);
				resolve();
			});

			ws.on('error', err => {
				if (!this.connectSettled) {
					this.connectSettled = true;
					clearTimeout(timer);
					reject(err);
					return;
				}
				this.rejectAllPending(err);
			});

			ws.on('message', data => this.onMessage(data.toString()));
			ws.on('close', () => {
				this.rejectAllPending(new Error('CDP connection closed'));
				this.emit('close');
			});
		});
	}

	send<T = unknown>(method: string, params?: object): Promise<T> {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			return Promise.reject(new Error(`Cannot send ${method}: connection not open`));
		}

		const id = this.nextId++;
		return new Promise<T>((resolve, reject) => {
			this.pending.set(id, {
				method,
				resolve: resolve as (value: unknown) => void,
				reject,
			});
			ws.send(JSON.stringify({ id, method, params }), err => {
				if (err) {
					this.pending.delete(id);
					reject(err);
				}
			});
		});
	}

	disconnect(): void {
		const ws = this.ws;
		this.ws = undefined;
		this.rejectAllPending(new Error('CDP connection closed'));
		ws?.close();
	}

	private onMessage(raw: string): void {
		let msg: { id?: number; method?: string; params?: object; result?: unknown; error?: { code: number; message: string } };
		try {
			msg = JSON.parse(raw);
		} catch (err) {
			// CDP frames should always be valid JSON; drop and warn rather than emit
			// 'error' (which would throw if nothing is listening).
			console.warn(`CDPConnection: ignoring malformed message — ${(err as Error).message}`);
			return;
		}

		if (typeof msg.id === 'number') {
			const pending = this.pending.get(msg.id);
			if (!pending) {
				return;
			}
			this.pending.delete(msg.id);
			if (msg.error) {
				pending.reject(new Error(`${pending.method}: ${msg.error.message}`));
			} else {
				pending.resolve(msg.result);
			}
		} else if (typeof msg.method === 'string') {
			this.emit(msg.method, msg.params ?? {});
		}
	}

	private rejectAllPending(reason: Error): void {
		for (const { reject } of this.pending.values()) {
			reject(reason);
		}
		this.pending.clear();
	}
}
