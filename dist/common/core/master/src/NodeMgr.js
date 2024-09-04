"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeMgr = void 0;
const NodeWorker_1 = require("../../woker/NodeWorker");
class NodeMgr {
    constructor() {
        this.serverMap = new Map();
    }
    async getServerInfo() {
        let result = `${'nodeId'.padEnd(20, ' ')}`
            + `${'pid'.padEnd(10, ' ')}`
            + `${'serverType'.padEnd(20, ' ')}`
            + `${'rss'.padEnd(10, ' ')}`
            + `${'heapTotal'.padEnd(12, ' ')}`
            + `${'heapUsed'.padEnd(10, ' ')}`
            + '\n';
        const tasks = [];
        this.serverMap.forEach(async (node) => {
            tasks.push(this.getChildMemoryUsage(node).then((data) => {
                if (!data) {
                    return;
                }
                result += `${node.serverConfig.nodeId.padEnd(20, ' ')}`;
                result += `${node.pid.toString().padEnd(10, ' ')}`;
                result += `${node.serverConfig.serverType.padEnd(20, ' ')}`;
                result += `${this.formatMemory(data.rss).padEnd(10, ' ')}`;
                result += `${this.formatMemory(data.heapTotal).padEnd(12, ' ')}`;
                result += `${this.formatMemory(data.heapUsed).padEnd(10, ' ')}`;
                result += ' \n';
            }));
        });
        await Promise.all(tasks);
        return result;
    }
    formatMemory(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    }
    getChildMemoryUsage(node) {
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage('getMemoryUsage');
                node.once('getMemoryUsage', (data) => {
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
}
exports.NodeMgr = NodeMgr;
//# sourceMappingURL=NodeMgr.js.map