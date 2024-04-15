import * as WS from "ws";
import * as path from "path";
import { RpcMessageType, RpcUtils } from "./RpcUtils";

export class RpcClient {

    private static _remoteMap = new Map<string, any>();
    private static getRemoteObject(rpcMsg: RpcReqMsg): Function {
        try {
            let remoteObject = this._remoteMap.get(rpcMsg.className);
            if (!remoteObject) {
                let remoteClass = require(
                    path.join(
                        __dirname, `../../../servers/${rpcMsg.serverName}/src/remote/${rpcMsg.className}`
                    )
                )[rpcMsg.className];
                remoteObject = new remoteClass;
                this._remoteMap.set(rpcMsg.className, remoteObject);
            }
            return remoteObject;
        } catch (error) {
            logger.error(`无法找到Remote,${JSON.stringify(rpcMsg)}`);
        }
    }

    private _requestMap = new Map<number, CallReq>();
    private _requestId: number = 1;
    private _socket: WS;
    public isClose: boolean = true;
    private _ip: string;
    private _port: number;

    constructor(ip: string, port: number) {
        this._ip = ip;
        this._port = port;
        setInterval(this.clearTimeOutReq.bind(this), 3000);
        this.connectRpcServer();
        this.setReconnectServer();
    }

    /** 清理过期请求 */
    private clearTimeOutReq() {
        const now = Date.now();
        this._requestMap.forEach((req, requestId, map) => {
            if (req.sendTime + 15000 < now) {
                logger.error(`reqest time out :${req.reqInfo}`)
                req.reject();
                map.delete(requestId);
            }
        })
    }

    /**
     * 重连RPC SERVER
     */
    private setReconnectServer() {
        setInterval(() => {
            if (this.isClose) {
                this.connectRpcServer()
            }
        }, 15000)
    }

    private connectRpcServer() {
        this._socket && this._socket.terminate();
        const url = "ws://" + this._ip + ":" + this._port;
        const socket: WS = new WS(url);
        this._socket = socket;

        socket.on("open", () => {
            this.isClose = false;
            // 第一条消息告知客户端信息
            this.send(serverConfig.serverType, serverConfig.nodeId, 'clientInfo', {}, []);
            logger.info(`${serverConfig.nodeId}[${process.pid}] connect rpc server successfully`)
        })

        socket.on('message', this.handleMessage.bind(this));

        //断线重连
        socket.on("close", () => {
            logger.log("rpc server close! ", this._port);
            this.isClose = true;
        })

        //失败重连
        socket.on("error", (err) => {
            logger.error('rpc client error! ', err);
            this.isClose = true;
        })
    }

    private handleMessage(msg: Buffer | string) {
        // 客户端收到 call  send  result
        const rpcMsg = RpcUtils.decodeRpcMsg(msg as any);
        switch (rpcMsg.type) {
            case RpcMessageType.call:
                return this.handleCall(rpcMsg as RpcReqMsg);
            case RpcMessageType.send:
                return this.handleSend(rpcMsg as RpcReqMsg);
            case RpcMessageType.result:
                this.handleResult(rpcMsg as RpcTransferResult);
                break;
        }
    }

    private handleResult(rpcResult: RpcTransferResult) {
        const requestCache = this._requestMap.get(rpcResult.requestId);
        if (!requestCache) return;
        // 返回值结果如果是buffer,需要单独处理
        if (rpcResult.result?.type === 'Buffer') {
            rpcResult.result = Buffer.from(rpcResult.result);
        }
        requestCache.resolve(rpcResult.result);
        this._requestMap.delete(rpcResult.requestId);
    }

    private async handleCall(rpcMsg: RpcReqMsg) {
        const remote = RpcClient.getRemoteObject(rpcMsg);
        const replay: RpcTransferResult = {
            type: RpcMessageType.result,
            fromNodeId: rpcMsg.fromNodeId,
            requestId: rpcMsg.requestId,
            result: null
        };
        replay.result = await remote[rpcMsg.funcName](...rpcMsg.args);
        this._socket.send(RpcUtils.encodeResult(replay));
    }

    private handleSend(rpcMsg: RpcReqMsg) {
        const remote = RpcClient.getRemoteObject(rpcMsg);
        remote[rpcMsg.funcName](...rpcMsg.args);
    }

    public call(serverName: string, className: string, funcName: string, routeOption: RpcRouterOptions, args?: any[]): Promise<any> {
        if (this.isClose) {
            logger.warn(`rpc${this._port} is not connected`);
            return;
        }
        return new Promise((resolve, reject) => {
            const requestId = this._requestId++;
            const buffer = RpcUtils.encodeCallReqest(serverConfig.nodeId, serverName, className, funcName, requestId, routeOption, args);
            this._socket.send(buffer);
            this._requestMap.set(requestId, {
                requestId,
                resolve,
                reject,
                sendTime: Date.now(),
                reqInfo: `${serverName}.${className}.${funcName}`
            });
        });
    }

    public send(serverName: string, className: string, funcName: string, routeOption: RpcRouterOptions, args?: any[]) {
        if (this.isClose) {
            logger.warn(`rpc${this._port} is not connected`);
            return;
        }
        const buffer = RpcUtils.encodeSendReqest(serverConfig.nodeId, serverName, className, funcName, routeOption, args);
        this._socket.send(buffer);
    }
}

interface CallReq {
    requestId: number;
    resolve: Function;
    reject: Function;
    sendTime: number;
    reqInfo: string;
}