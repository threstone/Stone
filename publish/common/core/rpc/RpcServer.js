"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const ServerInit_1 = require("../server/ServerInit");
const WS = require("ws");
const RpcUtils_1 = require("./RpcUtils");
ServerInit_1.ServerInit.init();
class RpcServer {
    constructor(port = startupParam.port) {
        this._serverMapList = new Map();
        this._nodeIdMap = new Map();
        // todo 暂时先用ws把功能实现,实现后再修改传输层
        let wss = new WS.Server({ port });
        logger.info(`[${process.pid}] rpc server start, port:${port}`);
        wss.on("connection", (ws, req) => {
            const session = { socket: ws, isInit: false };
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
    }
    handleMessage(session, msg) {
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
        RpcUtils_1.RpcUtils.transferMessage(msg, this._serverMapList, this._nodeIdMap);
    }
}
exports.server = new RpcServer();
