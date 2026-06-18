import * as path from 'path';
import { NodeMgr } from '../master/src/NodeMgr';
import { BaseWorker } from './BaseWorker';
export class NodeWorker extends BaseWorker {

    private _nodeMgr: NodeMgr;

    constructor(serverConfig: IServerConfig, nodeMgr: NodeMgr) {
        super(path.join(__dirname, '../server/ServerLauncher'), serverConfig);
        this.serverConfig = serverConfig;
        this._nodeMgr = nodeMgr;
        this.on('getServerInfo', this.onGetServerInfo.bind(this));
    }

    protected startWorker() {
        super.startWorker();
        this._nodeMgr.serverMap.set(this.serverConfig.nodeId, this);
        this.worker.on('exit', () => {
            this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
        });
    }

    /** 向node发送集群信息 */
    notifyClusterInfo(info: { nodeId: string, serverConfig: IServerConfig }[]) {
        this.sendMessage({ event: 'clusterInfo', info })
    }

    private async onGetServerInfo(message: { requestId: number }) {
        const requestId = message.requestId;
        try {
            const data = await this._nodeMgr.getServerInfo();
            this.sendMessage({ event: 'serverInfo', requestId, data });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.sendMessage({ event: 'serverInfo', requestId, error: errorMsg });
        }
    }

    kill(): void {
        super.kill();
        this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
    }
}
