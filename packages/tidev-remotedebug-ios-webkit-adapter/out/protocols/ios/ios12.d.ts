import { IOS9Protocol } from './ios9';
import { Target } from '../target';
export declare class IOS12Protocol extends IOS9Protocol {
    constructor(target: Target);
    private onTargetCreated;
}
