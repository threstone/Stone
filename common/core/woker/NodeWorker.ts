import * as path from 'path';
import { NodeMgr } from '../master/src/NodeMgr';
import { BaseWorker } from './BaseWorker';
export class NodeWorker extends BaseWorker {

    private _nodeMgr: NodeMgr;

    constructor(serverConfig: ServerConfig, nodeMgr: NodeMgr) {
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
}