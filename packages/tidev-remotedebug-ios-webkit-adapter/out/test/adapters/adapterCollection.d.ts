import * as WebSocket from 'ws';
import { ITarget, IAdapterOptions } from './adapterInterfaces';
import { Adapter } from './adapter';
import { Target } from '../protocols/target';
export declare class AdapterCollection extends Adapter {
    protected _adapters: Map<string, Adapter>;
    constructor(id: string, proxyUrl: string, options: IAdapterOptions);
    start(): Promise<any>;
    stop(): void;
    forceRefresh(): void;
    getTargets(metadata?: any): Promise<ITarget[]>;
    connectTo(url: string, wsFrom: WebSocket): Target;
    forwardTo(url: string, message: string): void;
    private getWebSocketId;
}
