import { IOSProtocol } from './ios';
import { Target } from '../target';
export declare class IOS9Protocol extends IOSProtocol {
    constructor(target: Target);
    protected mapSelectorList(selectorList: any): void;
}
