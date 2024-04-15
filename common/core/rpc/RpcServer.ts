import { ServerInit } from "../server/ServerInit";
import * as WS from "ws"
import { RpcUtils } from "./RpcUtils";

ServerInit.init();
class RpcServer {

    private _serverMapList = new Map<string, RpcSession[]>();
    private _nodeIdMap = new Map<string, RpcSession>();

    constructor(port = startupParam.port) {
        // todo 暂时先用ws把功能实现,实现后再修改传输层
        let wss = new WS.Server({ port });
        logger.info(`[${process.pid}] rpc server start, port:${port}`)
        wss.on("connection", (ws: WS, req) => {
            const session: RpcSession = { socket: ws, isInit: false }
            ws.on('message', this.handleMessage.bind(this, session));

            ws.on("error", (err: Error) => {
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
        })
    }

    private handleMessage(session: RpcSession, msg: Buffer | string) {
        if (session.isInit === false) {
            const rpcMsg = RpcUtils.decodeRpcMsg(msg as any) as RpcReqMsg;
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

        RpcUtils.transferMessage(msg as any, this._serverMapList, this._nodeIdMap);
    }
}

export interface RpcSession {
    socket: WS;
    isInit: boolean;
    serverType?: string;
    nodeId?: string;
}

export const server = new RpcServer();