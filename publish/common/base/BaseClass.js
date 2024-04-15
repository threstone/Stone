"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseClass = void 0;
class BaseClass {
    static ins(...args) {
        let cls = this;
        if (!cls._instance) {
            cls._instance = new cls(...args);
        }
        return cls._instance;
    }
}
exports.BaseClass = BaseClass;
