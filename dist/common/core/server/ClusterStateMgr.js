"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterStateMgr = void 0;
const StoneDefine_1 = require("../../StoneDefine");
/** 用来查看集群状态的管理器 */
class ClusterStateMgr {
    static init() {
        if (startupParam.nodeId === 'master') {
            return;
        }
        this.serverMap = new Map();
        global.getClusterInfo = this.getClusterInfo.bind(this);
        const eventMap = new Map([
            ['getChildInfo', this.getChildInfo.bind(this)],
            ['clusterInfo', this.initClusterInfo.bind(this)]
        ]);
        process.on('message', (message) => {
            var _a;
            (_a = eventMap.get(message.event)) === null || _a === void 0 ? void 0 : _a(message);
        });
    }
    static getChildInfo() {
        const memoryUsage = process.memoryUsage();
        process.send({ event: 'childInfo', data: { memoryUsage, uptime: process.uptime() } });
    }
    static initClusterInfo(message) {
        this.serverMap.clear();
        message.info.forEach((nodeInfo) => {
            this.serverMap.set(nodeInfo.nodeId, nodeInfo.serverConfig);
            // 配置Map中没有则说明是动态添加的服务,添加配置到Map中
            if (!serversConfigMap.has(nodeInfo.nodeId)) {
                serversConfigMap.set(nodeInfo.nodeId, nodeInfo.serverConfig);
            }
        });
        eventEmitter.emit(StoneDefine_1.StoneEvent.ClusterStatusUpdate, this.serverMap);
    }
    static getClusterInfo() {
        return this.serverMap;
    }
}
exports.ClusterStateMgr = ClusterStateMgr;
//# sourceMappingURL=ClusterStateMgr.js.map