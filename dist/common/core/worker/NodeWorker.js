"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeWorker = void 0;
const path = require("path");
const BaseWorker_1 = require("./BaseWorker");
class NodeWorker extends BaseWorker_1.BaseWorker {
    constructor(serverConfig, nodeMgr) {
        super(path.join(__dirname, '../server/ServerLauncher'), serverConfig);
        this.serverConfig = serverConfig;
        this._nodeMgr = nodeMgr;
        this.on('getServerInfo', this.onGetServerInfo.bind(this));
    }
    startWorker() {
        super.startWorker();
        this._nodeMgr.serverMap.set(this.serverConfig.nodeId, this);
        this.worker.on('exit', () => {
            this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
        });
    }
    /** 向node发送集群信息 */
    notifyClusterInfo(info) {
        this.sendMessage({ event: 'clusterInfo', info });
    }
    async onGetServerInfo(message) {
        const requestId = message.requestId;
        try {
            const data = await this._nodeMgr.getServerInfo();
            this.sendMessage({ event: 'serverInfo', requestId, data });
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.sendMessage({ event: 'serverInfo', requestId, error: errorMsg });
        }
    }
    kill() {
        super.kill();
        this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
    }
}
exports.NodeWorker = NodeWorker;
//# sourceMappingURL=NodeWorker.js.map