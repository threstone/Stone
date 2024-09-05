import * as ChildProcess from 'child_process';
import { NodeWorker } from '../../woker/NodeWorker';
export class NodeMgr {
    public serverMap: Map<string, NodeWorker>;

    constructor() {
        this.serverMap = new Map<string, NodeWorker>();
    }

    public async getServerInfo() {
        const maxLens = {
            ['pid']: 'pid'.length + 2,
            ['nodeId']: 'nodeId'.length + 2,
            ['serverType']: 'serverType'.length + 2,
            ['rss']: 'rss'.length + 2,
            ['heapTotal']: 'heapTotal'.length + 2,
            ['heapUsed']: 'heapUsed'.length + 2,
            ['runTime']: 'runTime'.length + 2,
        };
        const datas: {
            [key: string]: {
                ['nodeId']: string,
                ['pid']: string,
                ['serverType']: string,
                ['rss']: string,
                ['heapTotal']: string,
                ['heapUsed']: string,
                ['runTime']: string,
            }[]
        } = {};
        const tasks = [];
        this.serverMap.forEach(async (node) => {
            tasks.push(this.getChildMemoryUsage(node).then((data: { memoryUsage: NodeJS.MemoryUsage, uptime: number }) => {
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
                })
            });
        });
        return result;
    }

    private formatMemory(bytes: number) {
        return (bytes / 1024 / 1024).toFixed(2);
    }

    private getChildMemoryUsage(node: NodeWorker) {
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage('getChildInfo');
                node.once('getChildInfo', (data: { memoryUsage: NodeJS.MemoryUsage, uptime: number }) => {
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

