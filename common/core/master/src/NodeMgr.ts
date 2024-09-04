import * as ChildProcess from 'child_process';
import { NodeWorker } from '../../woker/NodeWorker';
export class NodeMgr {
    public serverMap: Map<string, NodeWorker>;

    constructor() {
        this.serverMap = new Map<string, NodeWorker>();
    }

    public async getServerInfo() {
        let result = `${'nodeId'.padEnd(20, ' ')}`
            + `${'pid'.padEnd(10, ' ')}`
            + `${'serverType'.padEnd(20, ' ')}`
            + `${'rss'.padEnd(10, ' ')}`
            + `${'heapTotal'.padEnd(12, ' ')}`
            + `${'heapUsed'.padEnd(10, ' ')}`
            + '\n';
        const tasks = [];
        this.serverMap.forEach(async (node) => {
            tasks.push(this.getChildMemoryUsage(node).then((data: NodeJS.MemoryUsage) => {
                if (!data) {
                    return;
                }
                result += `${node.serverConfig.nodeId.padEnd(20, ' ')}`
                result += `${node.pid.toString().padEnd(10, ' ')}`
                result += `${node.serverConfig.serverType.padEnd(20, ' ')}`;
                result += `${this.formatMemory(data.rss).padEnd(10, ' ')}`
                result += `${this.formatMemory(data.heapTotal).padEnd(12, ' ')}`
                result += `${this.formatMemory(data.heapUsed).padEnd(10, ' ')}`
                result += ' \n';
            }));
        });
        await Promise.all(tasks);
        return result;
    }

    private formatMemory(bytes: number) {
        return (bytes / 1024 / 1024).toFixed(2);
    }

    private getChildMemoryUsage(node: NodeWorker) {
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage('getMemoryUsage');
                node.once('getMemoryUsage', (data: NodeJS.MemoryUsage) => {
                    resolve(data);
                });
            }),
            new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 5000);
            })])
    }

    public startServer(nodeId: string) {
        if (this.serverMap.has(nodeId)) {
            return;
        }
        const serverConf = serversConfigMap.get(nodeId);
        if (!serverConf) {
            return;
        }
        this.startNode(serverConf);
    }

    public startServers() {
        serversConfigMap.forEach((serverConf) => {
            if (serverConf.serverType !== 'master') {
                this.startNode(serverConf);
            }
        });
    }

    private startNode(serverConf: ServerConfig) {
        const node = new NodeWorker(serverConf, this);
        let options: ChildProcess.ForkOptions = {};
        if (typeof serverConf.inspectPort === 'number') {
            options.execArgv = [`--inspect=${serverConf.inspectPort}`]
        }
        node.fork(options);
    }

    public restart(nodeId: string) {
        const node = this.serverMap.get(nodeId);
        const serverConfig = serversConfigMap.get(nodeId);
        if (!node || !serverConfig) {
            return;
        }
        node.restart(serverConfig);
    }
}

