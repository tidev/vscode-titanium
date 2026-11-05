import { Adapter } from './adapter';
import { ITarget } from './adapterInterfaces';
export declare class TestAdapter extends Adapter {
    private _jsonPath;
    constructor(id: string, proxyUrl: string);
    getTargets(): Promise<ITarget[]>;
}
