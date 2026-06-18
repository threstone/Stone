import * as ChildProcess from 'child_process';
import { NodeWorker } from '../../worker/NodeWorker';
import { RpcManager } from '../../rpc/RpcManager';
import { CommonUtils } from '../../../CommonUtils';
import { ServersConfigMgr } from '../../server/ServersConfigMgr';
import { LauncherOption } from '../../../LauncherOption';
export class NodeMgr {

    public serverMap: Map<string, NodeWorker>;

    constructor() {
        this.serverMap = new Map<string, NodeWorker>();
        const setFun = this.serverMap.set.bind(this.serverMap);
        const deleteFun = this.serverMap.delete.bind(this.serverMap);
        this.serverMap.set = (k, v) => {
            const res = setFun(k, v);
            this.notifyNodeClusterUpdate();
            return res;
        };
        this.serverMap.delete = (k) => {
            const res = deleteFun(k);
            this.notifyNodeClusterUpdate();
            return res;
        };
    }

    private notifyNodeClusterUpdate() {
        const info = [];
        this.serverMap.forEach((nodeWorker, nodeId) => {
            info.push({ nodeId, serverConfig: nodeWorker.serverConfig });
        });
        this.serverMap.forEach((node) => {
            node.notifyClusterInfo(info);
        })
    }

    public async getServerInfo(): Promise<IServerInfoMap> {
        const memoryUsage = process.memoryUsage();
        const datas: IServerInfoMap = {
            master: [{
                pid: process.pid,
                nodeId: 'master',
                serverType: 'master',
                memoryUsage,
                uptime: process.uptime()
            }]
        };

        const tasks: Promise<void>[] = [];
        this.serverMap.forEach((node) => {
            tasks.push(this.pushWorkerInfo(datas, node));
        });
        RpcManager.getRpcWorker().forEach((node) => {
            tasks.push(this.pushWorkerInfo(datas, node));
        });
        await Promise.all(tasks);
        return datas;
    }

    public async getServerInfoStr() {
        const datas = await this.getServerInfo();
        const maxLens = {
            ['pid']: 'pid'.length + 2,
            ['nodeId']: 'nodeId'.length + 2,
            ['serverType']: 'serverType'.length + 2,
            ['rss']: 'rss'.length + 2,
            ['heapTotal']: 'heapTotal'.length + 2,
            ['heapUsed']: 'heapUsed'.length + 2,
            ['runTime']: 'runTime'.length + 2,
        };
        const tableDatas: {
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
        Object.keys(datas).forEach((serverType) => {
            tableDatas[serverType] = datas[serverType].map((info) => {
                return {
                    pid: info.pid.toString(),
                    nodeId: info.nodeId,
                    serverType: info.serverType,
                    rss: CommonUtils.formatMemory(info.memoryUsage.rss),
                    heapTotal: CommonUtils.formatMemory(info.memoryUsage.heapTotal),
                    heapUsed: CommonUtils.formatMemory(info.memoryUsage.heapUsed),
                    runTime: (info.uptime / 60).toFixed(2)
                };
            });
            tableDatas[serverType].forEach((serverInfo) => {
                Object.keys(serverInfo).forEach((key) => {
                    maxLens[key] = Math.max(serverInfo[key].length + 2, maxLens[key]);
                });
            });
        });

        // 将数据组织成表格显示
        let result = '';
        const keys = Object.keys(maxLens);
        keys.forEach((key) => {
            result += `${key.padEnd(maxLens[key], ' ')}`;
        });
        Object.keys(tableDatas).sort((a, b) => { return this.getWeight(a) > this.getWeight(b) ? 1 : -1 }).forEach((serverType) => {
            const list = tableDatas[serverType];
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

    private async pushWorkerInfo(datas: IServerInfoMap, node: { getWorkerInfo(): Promise<IServerRuntimeInfo> }) {
        const info = await node.getWorkerInfo();
        if (datas[info.serverType] == null) {
            datas[info.serverType] = [];
        }
        datas[info.serverType].push(info);
    }

    public startServer(nodeId: string) {
        if (this.serverMap.has(nodeId)) {
            return;
        }
        const serverConf = serversConfigMap.get(nodeId);
        if (!serverConf) {
            logger.error(`start node fail,serverConfig not found ${nodeId}`)
            return;
        }
        this.startNode(serverConf);
    }

    public startServers() {
        setTimeout(() => {
            serversConfigMap.forEach((serverConf) => {
                if (serverConf.serverType !== 'master') {
                    this.startNode(serverConf);
                }
            });
        }, 1000);
    }

    private startNode(serverConf: IServerConfig) {
        const node = new NodeWorker(serverConf, this);
        let options: ChildProcess.ForkOptions = {};
        if (typeof serverConf.inspectPort === 'number') {
            options.execArgv = [`--inspect=${serverConf.inspectPort}`]
        }
        node.fork(options);
    }

    public kill(nodeId: string) {
        this.serverMap.get(nodeId)?.kill();
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

    public add(params: string[]) {
        const param = new LauncherOption(params);
        if (!param.nodeId || !param.serverType) {
            logger.error(`add node fail,nodeId or serverType not found ${JSON.stringify(param)}`);
            return;
        }
        if (this.serverMap.has(param.nodeId)) {
            logger.error(`add node fail,node already exists : ${param.nodeId}`);
            return;
        }
        if (!ServersConfigMgr.getAllServerTypes().has(param.serverType)) {
            logger.error(`add node fail,unkonw serverType : ${param.serverType}`);
            return;
        }

        param.env = startupParam.env;
        serversConfigMap.set(param.nodeId, param);
        this.startServer(param.nodeId);
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

