import { IOS12Protocol } from './ios12';
import { Target } from '../target';
export declare class IOS13Protocol extends IOS12Protocol {
    constructor(target: Target);
    onRuntimeGetProperties(msg: any): Promise<any>;
}
