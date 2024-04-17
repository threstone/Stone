"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcClient = void 0;
const WS = require("ws");
const path = require("path");
const RpcUtils_1 = require("./RpcUtils");
const StoneDefine_1 = require("../../StoneDefine");
class RpcClient {
    constructor(ip, port) {
        this._requestMap = new Map();
        this._requestId = 1;
        this.isClose = true;
        this._ip = ip;
        this._port = port;
        setInterval(this.clearTimeOutReq.bind(this), 3000);
        this.connectRpcServer();
        this.setReconnectServer();
    }
    static getRemoteObject(rpcMsg) {
        try {
            let remoteObject = this._remoteMap.get(rpcMsg.className);
            if (!remoteObject) {
                let remoteClass;
                try {
                    remoteClass = require(path.join(process.cwd(), `dist/app/servers/${rpcMsg.serverName}/src/remote/${rpcMsg.className}`))[rpcMsg.className];
                }
                catch (error) {
                    remoteClass = require(path.join(process.cwd(), `app/servers/${rpcMsg.serverName}/src/remote/${rpcMsg.className}`))[rpcMsg.className];
                }
                remoteObject = new remoteClass;
                this._remoteMap.set(rpcMsg.className, remoteObject);
            }
            return remoteObject;
        }
        catch (error) {
            logger.error(`无法找到Remote,${JSON.stringify(rpcMsg)}`);
        }
    }
    /** 清理过期请求 */
    clearTimeOutReq() {
        const now = Date.now();
        this._requestMap.forEach((req, requestId, map) => {
            if (req.sendTime + 15000 < now) {
                logger.error(`reqest time out :${req.reqInfo}`);
                req.reject();
                map.delete(requestId);
            }
        });
    }
    /**
     * 重连RPC SERVER
     */
    setReconnectServer() {
        setInterval(() => {
            if (this.isClose) {
                this.connectRpcServer();
            }
        }, 15000);
    }
    connectRpcServer() {
        this._socket && this._socket.terminate();
        const url = "ws://" + this._ip + ":" + this._port;
        const socket = new WS(url);
        this._socket = socket;
        socket.on("open", () => {
            this.isClose = false;
            // 第一条消息告知客户端信息
            this.send(serverConfig.serverType, serverConfig.nodeId, 'clientInfo', {}, []);
            eventEmitter.emit(StoneDefine_1.StoneEvent.RpcServerConnected);
            logger.info(`${serverConfig.nodeId}[${process.pid}] connect rpc server successfully`);
        });
        socket.on('message', this.handleMessage.bind(this));
        //断线重连
        socket.on("close", () => {
            logger.log("rpc server close! ", this._port);
            this.isClose = true;
        });
        //失败重连
        socket.on("error", (err) => {
            logger.error('rpc client error! ', err);
            this.isClose = true;
        });
    }
    handleMessage(msg) {
        // 客户端收到 call  send  result
        const rpcMsg = RpcUtils_1.RpcUtils.decodeRpcMsg(msg);
        switch (rpcMsg.type) {
            case RpcUtils_1.RpcMessageType.call:
                return this.handleCall(rpcMsg);
            case RpcUtils_1.RpcMessageType.send:
                return this.handleSend(rpcMsg);
            case RpcUtils_1.RpcMessageType.result:
                this.handleResult(rpcMsg);
                break;
        }
    }
    handleResult(rpcResult) {
        var _a;
        const requestCache = this._requestMap.get(rpcResult.requestId);
        if (!requestCache)
            return;
        // 返回值结果如果是buffer,需要单独处理
        if (((_a = rpcResult.result) === null || _a === void 0 ? void 0 : _a.type) === 'Buffer') {
            rpcResult.result = Buffer.from(rpcResult.result);
        }
        requestCache.resolve(rpcResult.result);
        this._requestMap.delete(rpcResult.requestId);
    }
    async handleCall(rpcMsg) {
        const remote = RpcClient.getRemoteObject(rpcMsg);
        const replay = {
            type: RpcUtils_1.RpcMessageType.result,
            fromNodeId: rpcMsg.fromNodeId,
            requestId: rpcMsg.requestId,
            result: null
        };
        replay.result = await remote[rpcMsg.funcName](...rpcMsg.args);
        this._socket.send(RpcUtils_1.RpcUtils.encodeResult(replay));
    }
    handleSend(rpcMsg) {
        const remote = RpcClient.getRemoteObject(rpcMsg);
        remote[rpcMsg.funcName](...rpcMsg.args);
    }
    call(serverName, className, funcName, routeOption, args) {
        if (this.isClose) {
            logger.warn(`rpc${this._port} is not connected`);
            return;
        }
        return new Promise((resolve, reject) => {
            const requestId = this._requestId++;
            const buffer = RpcUtils_1.RpcUtils.encodeCallReqest(serverConfig.nodeId, serverName, className, funcName, requestId, routeOption, args);
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
    send(serverName, className, funcName, routeOption, args) {
        if (this.isClose) {
            logger.warn(`rpc${this._port} is not connected`);
            return;
        }
        const buffer = RpcUtils_1.RpcUtils.encodeSendReqest(serverConfig.nodeId, serverName, className, funcName, routeOption, args);
        this._socket.send(buffer);
    }
}
exports.RpcClient = RpcClient;
RpcClient._remoteMap = new Map();
//# sourceMappingURL=RpcClient.js.map