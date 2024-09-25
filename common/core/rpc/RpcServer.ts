import * as WS from "ws"
import { RpcUtils } from "./RpcUtils";
import { RpcSession } from "./RpcSession";
class RpcServer {

    private _serverMapList = new Map<string, RpcSession[]>();
    private _nodeIdMap = new Map<string, RpcSession>();

    /**
     * 尽量保证所有客户端都连接上了再处理消息,增加一个缓冲时间
     * 防止A call B 但是B还未连接上RPC server导致消息无法成功转发
     */
    private _isHandleMsg: boolean;

    constructor(port = startupParam.port) {
        // todo 暂时先用ws把功能实现,实现后再修改传输层
        let wss = new WS.Server({ port });
        logger.debug(`[${process.pid}] rpc server start, port:${port}`)
        wss.on("connection", (ws: WS, req) => {
            const session = new RpcSession(ws);
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

    private handleMessage(session: RpcSession, buffer: Buffer) {
        try {
            const msg = buffer.toString();
            if (session.isInit === false) {
                const rpcMsg = RpcUtils.decodeRpcMsg(msg) as RpcReqMsg;
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
                RpcUtils.transferMessage(msg, this._serverMapList, this._nodeIdMap);
            } else {
                eventEmitter.once('RpcServerHandleStart', () => {
                    RpcUtils.transferMessage(msg, this._serverMapList, this._nodeIdMap);
                });
            }
        } catch (error) {
            logger.error('rpc server 处理消息出错:', error);
        }
    }
}

export const server = new RpcServer();

export { RpcSession };
