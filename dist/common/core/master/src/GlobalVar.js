"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalVar = void 0;
const NodeMgr_1 = require("./NodeMgr");
const CommandServer_1 = require("./CommandServer");
class GlobalVar {
    static init() {
        logger.info(`[${process.pid}] init ...`);
        // 命令模块
        this.commonServer = new CommandServer_1.CommonServer();
        // 子进程模块
        this.nodeMgr = new NodeMgr_1.NodeMgr();
        this.nodeMgr.startServers();
    }
}
exports.GlobalVar = GlobalVar;
//# sourceMappingURL=GlobalVar.js.map