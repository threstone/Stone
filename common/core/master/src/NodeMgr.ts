import * as ChildProcess from 'child_process';
import { NodeWorker } from '../../woker/NodeWorker';
export class NodeMgr {
    public serverMap: Map<string, NodeWorker>;

    constructor() {
        this.serverMap = new Map<string, NodeWorker>();
    }

    public getServerInfo() {
        const list: ServerConfig[] = [];
        this.serverMap.forEach((node) => {
            const config: any = { "pid": node.pid, ...node.serverConfig };
            list.push(config);
        })
        return list;
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

