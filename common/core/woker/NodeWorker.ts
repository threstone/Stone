import * as path from 'path';
import { NodeMgr } from '../master/src/NodeMgr';
import { BaseWorker } from './BaseWorker';
export class NodeWorker extends BaseWorker {

    private _nodeMgr: NodeMgr;

    constructor(serverConfig: IServerConfig, nodeMgr: NodeMgr) {
        super(path.join(__dirname, '../server/ServerLauncher'), serverConfig);
        this.serverConfig = serverConfig;
        this._nodeMgr = nodeMgr;
    }

    protected startWorker() {
        super.startWorker();
        this._nodeMgr.serverMap.set(this.serverConfig.nodeId, this);
        this.worker.on('exit', () => {
            this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
        });
    }

    /** 向node发送集群信息 */
    notifyClusterInfo() {
        const info = [];
        this._nodeMgr.serverMap.forEach((nodeWorker, nodeId) => {
            info.push({ nodeId, serverConfig: nodeWorker.serverConfig });
        });
        this.sendMessage({ event: 'clusterInfo', info })
    }

    kill(): void {
        super.kill();
        this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
    }
}