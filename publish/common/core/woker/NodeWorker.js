"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeWorker = void 0;
const Path = require("path");
const BaseWorker_1 = require("./BaseWorker");
class NodeWorker extends BaseWorker_1.BaseWorker {
    constructor(serverType, serverConfig, nodeMgr) {
        super(Path.join(__dirname, `../../../servers/${serverType}/src/bin/main`), serverConfig);
        this.serverConfig = serverConfig;
        this._nodeMgr = nodeMgr;
    }
    startWorker() {
        super.startWorker();
        this._nodeMgr.serverMap.set(this.serverConfig.nodeId, this);
        this.worker.on('exit', () => {
            this._nodeMgr.serverMap.delete(this.serverConfig.nodeId);
        });
    }
}
exports.NodeWorker = NodeWorker;
