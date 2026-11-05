/// <reference types="node" />
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ITarget } from '../adapters/adapterInterfaces';
export declare class Target extends EventEmitter {
    private _data;
    private _url;
    private _wsTarget;
    private _wsTools;
    private _isConnected;
    private _messageBuffer;
    private _messageFilters;
    private _toolRequestMap;
    private _adapterRequestMap;
    private _requestId;
    private _id;
    private _targetBased;
    private _targetId;
    constructor(targetId: string, data?: ITarget);
    get data(): ITarget;
    set targetBased(isTargetBased: boolean);
    set targetId(targetId: string);
    connectTo(url: string, wsFrom: WebSocket): void;
    forward(message: string): void;
    updateClient(wsFrom: WebSocket): void;
    addMessageFilter(method: string, filter: (msg: any) => Promise<any>): void;
    callTarget(method: string, params: any): Promise<any>;
    fireEventToTools(method: string, params: any): void;
    fireResultToTools(id: number, params: any): void;
    replyWithEmpty(msg: any): Promise<any>;
    private onMessageFromTools;
    private onMessageFromTarget;
    private sendToTools;
    private sendToTarget;
    private isSocketConnected;
}
