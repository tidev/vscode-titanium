import { IOSProtocol } from './ios';
import { Target } from '../target';
export declare class IOS8Protocol extends IOSProtocol {
    constructor(target: Target);
    protected mapSelectorList(selectorList: any): void;
}
