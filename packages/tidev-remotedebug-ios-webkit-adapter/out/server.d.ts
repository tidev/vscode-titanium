/// <reference types="node" />
import { EventEmitter } from 'events';
export declare class ProxyServer extends EventEmitter {
    private _hs;
    private _es;
    private _wss;
    private _serverPort;
    private _adapter;
    private _clients;
    private _targetFetcherInterval;
    private _unixPort;
    constructor();
    run(serverPort: number, simUdid?: string): Promise<number>;
    stop(): void;
    private startTargetFetcher;
    private stopTargetFetcher;
    private setupHttpHandlers;
    private onWSSConnection;
}
