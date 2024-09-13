"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeMgr = void 0;
const NodeWorker_1 = require("../../woker/NodeWorker");
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
        this.serverMap.forEach(async (node) => {
            tasks.push(this.getChildMemoryUsage(node).then((data) => {
                if (!data) {
                    return;
                }
                if (!datas[node.serverConfig.serverType]) {
                    datas[node.serverConfig.serverType] = [];
                }
                const childData = {
                    pid: node.pid.toString(),
                    nodeId: node.serverConfig.nodeId,
                    serverType: node.serverConfig.serverType,
                    rss: this.formatMemory(data.memoryUsage.rss),
                    heapTotal: this.formatMemory(data.memoryUsage.heapTotal),
                    heapUsed: this.formatMemory(data.memoryUsage.heapUsed),
                    runTime: (data.uptime / 60).toFixed(2)
                };
                Object.keys(childData).forEach((key) => {
                    maxLens[key] = Math.max(childData[key].length + 2, maxLens[key]);
                });
                datas[node.serverConfig.serverType].push(childData);
            }));
        });
        await Promise.all(tasks);
        let result = '';
        const keys = Object.keys(maxLens);
        keys.forEach((key) => {
            result += `${key.padEnd(maxLens[key], ' ')}`;
        });
        Object.keys(datas).forEach((serverType) => {
            const list = datas[serverType];
            list.forEach((childData) => {
                result += '\n';
                keys.forEach((key) => {
                    result += `${childData[key].padEnd(maxLens[key], ' ')}`;
                });
            });
        });
        return result;
    }
    formatMemory(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    }
    getChildMemoryUsage(node) {
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage('getChildInfo');
                node.once('getChildInfo', (data) => {
                    resolve(data);
                });
            }),
            new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 5000);
            })
        ]);
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
            return;
        }
        node.restart(serverConfig);
    }
    restartAll() {
        this.serverMap.forEach((node, nodeId) => {
            const serverConfig = serversConfigMap.get(nodeId);
            if (!serverConfig) {
                return;
            }
            node.restart(serverConfig);
        });
    }
}
exports.NodeMgr = NodeMgr;
//# sourceMappingURL=NodeMgr.js.map