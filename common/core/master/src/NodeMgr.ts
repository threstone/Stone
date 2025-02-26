import * as ChildProcess from 'child_process';
import { NodeWorker } from '../../woker/NodeWorker';
import { RpcManager } from '../../rpc/RpcManager';
import { CommonUtils } from '../../../CommonUtils';
export class NodeMgr {
    public serverMap: Map<string, NodeWorker>;

    constructor() {
        this.serverMap = new Map<string, NodeWorker>();
        // const setFun = this.serverMap.set.bind(this.serverMap);
        // const deleteFun = this.serverMap.delete.bind(this.serverMap);
        // this.serverMap.set = (k, v) => {
        //     console.log('set');
        //     return setFun(k, v);
        // };
        // this.serverMap.delete = (k) => {
        //     console.log('delete');
        //     return deleteFun(k);
        // };
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
        const memoryUsage = process.memoryUsage();
        const masterData = {
            pid: process.pid.toString(),
            nodeId: 'master',
            serverType: 'master',
            rss: CommonUtils.formatMemory(memoryUsage.rss),
            heapTotal: CommonUtils.formatMemory(memoryUsage.heapTotal),
            heapUsed: CommonUtils.formatMemory(memoryUsage.heapUsed),
            runTime: (process.uptime() / 60).toFixed(2)
        };
        Object.keys(masterData).forEach((key) => {
            maxLens[key] = Math.max(masterData[key].length + 2, maxLens[key]);
        });
        datas['master'] = [masterData];
        this.serverMap.forEach((node) => {
            tasks.push(node.getWokerMessage(node, maxLens, datas));
        });
        RpcManager.getRpcWorker().forEach((node) => {
            tasks.push(node.getWokerMessage(node, maxLens, datas));
        });
        await Promise.all(tasks);

        // 将数据组织成表格显示
        let result = '';
        const keys = Object.keys(maxLens);
        keys.forEach((key) => {
            result += `${key.padEnd(maxLens[key], ' ')}`;
        });
        Object.keys(datas).sort((a, b) => { return this.getWeight(a) > this.getWeight(b) ? 1 : -1 }).forEach((serverType) => {
            const list = datas[serverType];
            // 根据pid sort一下
            list.sort((a, b) => { return this.getWeight(a.nodeId) > this.getWeight(b.nodeId) ? 1 : -1; })
            list.forEach((childData) => {
                result += '\n';
                keys.forEach((key) => {
                    result += `${childData[key].padEnd(maxLens[key], ' ')}`;
                })
            });
        });
        return result;
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
            logger.error(`restart ${nodeId} fail,node or serverConfig not found`);
            return;
        }
        node.restart(serverConfig);
    }

    public restartAll() {
        this.serverMap.forEach((node, nodeId) => {
            process.nextTick(() => {
                this.restart(nodeId);
            });
        })
    }

    private getWeight(name: string) {
        if (name === 'master') {
            return Number.MIN_SAFE_INTEGER;
        }
        let result = 0;
        for (let index = 0; index < name.length; index++) {
            result += name.charCodeAt(index)
        }
        return result;
    }
}

