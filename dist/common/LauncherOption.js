"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LauncherOption = void 0;
const CommonUtils_1 = require("./CommonUtils");
class LauncherOption {
    constructor(args) {
        this.autuResume = false;
        this.logTrace = false;
        this.logLevel = 'All';
        this.consoleLog = true;
        this.rpcBulkSize = 100;
        this.rpcBulkTime = 10;
        CommonUtils_1.CommonUtils.getParams(args, this);
        global.nodeId = this.nodeId;
        global.env = this.env;
    }
}
exports.LauncherOption = LauncherOption;
//# sourceMappingURL=LauncherOption.js.map