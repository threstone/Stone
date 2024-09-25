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
        /**
         * 尽量保证所有客户端都连接上了再处理消息,增加一个缓冲时间
         * 防止A call B 但是B还未连接上RPC server导致消息无法成功转发
         */
        this._isHandleMsg = false;
        setTimeout(() => {
            this._isHandleMsg = true;
            eventEmitter.emit('RpcServerHandleStart');
        }, 3000);
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