"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ios12_1 = require("./ios12");
class IOS13Protocol extends ios12_1.IOS12Protocol {
    constructor(target) {
        super(target);
        target.targetBased = false;
    }
    onRuntimeGetProperties(msg) {
        try {
            const newPropertyDescriptors = [];
            let { properties } = msg.result;
            if (!properties) {
                properties = msg.result;
            }
            for (let i = 0; i < properties.length; i++) {
                if (properties[i].isOwn || properties[i].nativeGetter) {
                    properties[i].isOwn = true;
                    newPropertyDescriptors.push(properties[i]);
                }
            }
            msg.result = null;
            msg.result = { result: newPropertyDescriptors };
            return Promise.resolve(msg);
        }
        catch (error) {
            console.log(error);
            console.log(msg);
        }
        return Promise.resolve({});
    }
}
exports.IOS13Protocol = IOS13Protocol;
