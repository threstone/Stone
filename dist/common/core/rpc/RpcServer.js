"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcSession = exports.server = void 0;
const WS = require("ws");
const RpcUtils_1 = require("./RpcUtils");
const RpcSession_1 = require("./RpcSession");
Object.defineProperty(exports, "RpcSession", { enumerable: true, get: function () { return RpcSession_1.RpcSession; } });
class RpcServer {
    constructor(port = startupParam.port) {
        this._serverMapList = new Map();
        this._nodeIdMap = new Map();
        this._expectedClients = 0;
        this._connectedClients = 0;
        // todo 暂时先用ws把功能实现,实现后再修改传输层
        let wss = new WS.Server({ port });
        logger.debug(`[${process.pid}] rpc server start, port:${port}`);
        wss.on("connection", (ws, req) => {
            const session = new RpcSession_1.RpcSession(ws);
            ws.on('message', this.handleMessage.bind(this, session));
            ws.on("error", (err) => {
                logger.error("rpc client connection is error! ", err);
            });
            ws.on("close", () => {
                session.destroy();
                this._nodeIdMap.delete(session.nodeId);
                const nodeList = this._serverMapList.get(session.serverType);
                for (let index = 0; index < nodeList.length; index++) {
                    const tempSession = nodeList[index];
                    if (session.nodeId === tempSession.nodeId) {
                        nodeList.splice(index, 1);
                        break;
                    }
                }
            });
        });
        this._isHandleMsg = false;
        // 向 master 主动查询期望连接数（握手式，重启后自动重新查询）
        if (process.send) {
            process.send({ event: 'queryExpectedClients' });
        }
        // 接收 master 回传的期望连接数，连满后立即就绪
        process.on('message', (msg) => {
            if ((msg === null || msg === void 0 ? void 0 : msg.event) === 'setExpectedClients') {
                this._expectedClients = msg.count;
                this.tryReady();
            }
        });
        // 3 秒超时兜底，防止 master 未响应或节点数不符预期
        setTimeout(() => {
            this.tryReady(true);
        }, 3000);
    }
    tryReady(isTimeOutTrigger = false) {
        if (this._isHandleMsg) {
            return;
        }
        if (this._expectedClients === 0 || this._connectedClients >= this._expectedClients || isTimeOutTrigger) {
            this._isHandleMsg = true;
            logger.debug(`[${process.pid}] rpc server ready, connected: ${this._connectedClients}/${this._expectedClients}`);
            eventEmitter.emit('RpcServerHandleStart');
        }
    }
    handleMessage(session, buffer) {
        try {
            const msg = buffer.toString();
            if (session.isInit === false) {
                const rpcMsg = RpcUtils_1.RpcUtils.decodeRpcMsg(msg);
                session.isInit = true;
                session.serverType = rpcMsg.serverName;
                session.nodeId = rpcMsg.className;
                let nodeList = this._serverMapList.get(session.serverType);
                if (!nodeList) {
                    nodeList = [];
                    this._serverMapList.set(session.serverType, nodeList);
                }
                nodeList.push(session);
                this._nodeIdMap.set(session.nodeId, session);
                this._connectedClients++;
                this.tryReady();
                return;
            }
            if (this._isHandleMsg) {
                RpcUtils_1.RpcUtils.transferMessage(msg, this._serverMapList, this._nodeIdMap);
            }
            else {
                eventEmitter.once('RpcServerHandleStart', () => {
                    RpcUtils_1.RpcUtils.transferMessage(msg, this._serverMapList, this._nodeIdMap);
                });
            }
        }
        catch (error) {
            logger.error('rpc server 处理消息出错:', error);
        }
    }
}
exports.server = new RpcServer();
//# sourceMappingURL=RpcServer.js.map