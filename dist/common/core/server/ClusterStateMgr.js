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
        global.getServerInfo = this.getServerInfo.bind(this);
        const eventMap = new Map([
            ['getChildInfo', this.getChildInfo.bind(this)],
            ['clusterInfo', this.initClusterInfo.bind(this)],
            ['serverInfo', this.onServerInfo.bind(this)]
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
    static getServerInfo() {
        if (this.serverInfoReq) {
            return this.serverInfoReq.promise;
        }
        if (!process.send) {
            return Promise.reject(new Error('process.send is not available'));
        }
        const requestId = this.serverInfoRequestId;
        this.serverInfoRequestId = this.serverInfoRequestId >= Number.MAX_SAFE_INTEGER ? 1 : this.serverInfoRequestId + 1;
        let resolveReq;
        let rejectReq;
        const promise = new Promise((resolve, reject) => {
            resolveReq = resolve;
            rejectReq = reject;
        });
        const timer = setTimeout(() => {
            this.serverInfoReq = null;
            rejectReq(new Error('getServerInfo timeout'));
        }, 15000);
        this.serverInfoReq = { requestId, promise, resolve: resolveReq, reject: rejectReq, timer };
        process.send({ event: 'getServerInfo', requestId });
        return promise;
    }
    static onServerInfo(message) {
        const request = this.serverInfoReq;
        if (!request || request.requestId !== message.requestId) {
            return;
        }
        clearTimeout(request.timer);
        this.serverInfoReq = null;
        if (message.error) {
            request.reject(new Error(message.error));
        }
        else {
            request.resolve(message.data);
        }
    }
}
exports.ClusterStateMgr = ClusterStateMgr;
ClusterStateMgr.serverInfoRequestId = 1;
//# sourceMappingURL=ClusterStateMgr.js.map