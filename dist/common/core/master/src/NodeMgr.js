"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeMgr = void 0;
const NodeWorker_1 = require("../../woker/NodeWorker");
const RpcManager_1 = require("../../rpc/RpcManager");
class NodeMgr {
    constructor() {
        this.serverMap = new Map();
    }
    async getServerInfo() {
        const maxLens = {
            ['pid']: 'pid'.length + 2,
            ['nodeId']: 'nodeId'.length + 2,
            ['serverType']: 'serverType'.length + 2,
            ['rss']: 'rss'.length + 2,
            ['heapTotal']: 'heapTotal'.length + 2,
            ['heapUsed']: 'heapUsed'.length + 2,
            ['runTime']: 'runTime'.length + 2,
        };
        const datas = {};
        const tasks = [];
        const memoryUsage = process.memoryUsage();
        const masterData = {
            pid: process.pid.toString(),
            nodeId: 'master',
            serverType: 'master',
            rss: this.formatMemory(memoryUsage.rss),
            heapTotal: this.formatMemory(memoryUsage.heapTotal),
            heapUsed: this.formatMemory(memoryUsage.heapUsed),
            runTime: (process.uptime() / 60).toFixed(2)
        };
        Object.keys(masterData).forEach((key) => {
            maxLens[key] = Math.max(masterData[key].length + 2, maxLens[key]);
        });
        datas['master'] = [masterData];
        this.serverMap.forEach((node) => {
            tasks.push(this.getWokerMessage(node, maxLens, datas));
        });
        RpcManager_1.RpcManager.getRpcWorker().forEach((node) => {
            tasks.push(this.getWokerMessage(node, maxLens, datas));
        });
        await Promise.all(tasks);
        // 将数据组织成表格显示
        let result = '';
        const keys = Object.keys(maxLens);
        keys.forEach((key) => {
            result += `${key.padEnd(maxLens[key], ' ')}`;
        });
        Object.keys(datas).sort((a, b) => { return this.getWeight(a) > this.getWeight(b) ? 1 : -1; }).forEach((serverType) => {
            const list = datas[serverType];
            // 根据pid sort一下
            list.sort((a, b) => { return this.getWeight(a.nodeId) > this.getWeight(b.nodeId) ? 1 : -1; });
            list.forEach((childData) => {
                result += '\n';
                keys.forEach((key) => {
                    result += `${childData[key].padEnd(maxLens[key], ' ')}`;
                });
            });
        });
        return result;
    }
    startServer(nodeId) {
        if (this.serverMap.has(nodeId)) {
            return;
        }
        const serverConf = serversConfigMap.get(nodeId);
        if (!serverConf) {
            return;
        }
        this.startNode(serverConf);
    }
    startServers() {
        serversConfigMap.forEach((serverConf) => {
            if (serverConf.serverType !== 'master') {
                this.startNode(serverConf);
            }
        });
    }
    startNode(serverConf) {
        const node = new NodeWorker_1.NodeWorker(serverConf, this);
        let options = {};
        if (typeof serverConf.inspectPort === 'number') {
            options.execArgv = [`--inspect=${serverConf.inspectPort}`];
        }
        node.fork(options);
    }
    restart(nodeId) {
        const node = this.serverMap.get(nodeId);
        const serverConfig = serversConfigMap.get(nodeId);
        if (!node || !serverConfig) {
            logger.error(`restart ${nodeId} fail,node or serverConfig not found`);
            return;
        }
        node.restart(serverConfig);
    }
    restartAll() {
        this.serverMap.forEach((node, nodeId) => {
            process.nextTick(() => {
                this.restart(nodeId);
            });
        });
    }
    async getWokerMessage(node, maxLens, datas) {
        const info = await this.getWorkerInfo(node);
        const childData = {
            pid: node.pid.toString(),
            nodeId: node.serverConfig.nodeId,
            serverType: node.serverConfig.serverType,
            rss: this.formatMemory(info.memoryUsage.rss),
            heapTotal: this.formatMemory(info.memoryUsage.heapTotal),
            heapUsed: this.formatMemory(info.memoryUsage.heapUsed),
            runTime: (info.uptime / 60).toFixed(2)
        };
        Object.keys(childData).forEach((key) => {
            maxLens[key] = Math.max(childData[key].length + 2, maxLens[key]);
        });
        if (datas[node.serverConfig.serverType] == null) {
            datas[node.serverConfig.serverType] = [];
        }
        datas[node.serverConfig.serverType].push(childData);
    }
    getWorkerInfo(node) {
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage('getChildInfo');
                node.once('getChildInfo', (data) => {
                    data.pid = node.pid;
                    resolve(data);
                });
            }),
            new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        pid: node.pid,
                        memoryUsage: {
                            rss: 0,
                            heapTotal: 0,
                            heapUsed: 0,
                            external: 0,
                            arrayBuffers: 0,
                        },
                        uptime: 0
                    });
                }, 5000);
            })
        ]);
    }
    getWeight(name) {
        if (name === 'master') {
            return Number.MIN_SAFE_INTEGER;
        }
        let result = 0;
        for (let index = 0; index < name.length; index++) {
            result += name.charCodeAt(index);
        }
        return result;
    }
    formatMemory(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    }
}
exports.NodeMgr = NodeMgr;
//# sourceMappingURL=NodeMgr.js.map