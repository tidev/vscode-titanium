import * as WebSocket from 'ws';
import { Target } from '../protocols/target';
import { AdapterCollection } from './adapterCollection';
import { ITarget, IIOSProxySettings } from './adapterInterfaces';
export declare class IOSAdapter extends AdapterCollection {
    private _proxySettings;
    private _protocolMap;
    private _simulatorVersionMap;
    constructor(id: string, socket: string, proxySettings: IIOSProxySettings);
    getTargets(): Promise<ITarget[]>;
    connectTo(url: string, wsFrom: WebSocket): Target;
    static getProxySettings(args: IIOSProxySettings & {
        unixPort: string;
    }): Promise<IIOSProxySettings>;
    static getSimulatorUnixSocket(simUDID: string): Promise<string | null>;
    private static getProxyPath;
    private getProtocolFor;
    private getSimulatorVersion;
}
