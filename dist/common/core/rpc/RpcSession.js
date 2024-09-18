"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcSession = void 0;
class RpcSession {
    constructor(socket) {
        this._isCahce = false;
        this._socket = socket;
        this.isInit = false;
        if (startupParam.rpcBulkTime !== 0) {
            this._cacheMsgs = [];
            this._isCahce = true;
            setInterval(this.doSend.bind(this), startupParam.rpcBulkTime);
        }
    }
    doSend() {
        if (this._cacheMsgs.length === 0) {
            return;
        }
        this._socket.send(JSON.stringify(this._cacheMsgs));
        this._cacheMsgs = [];
    }
    send(data) {
        if (this._isCahce) {
            this._cacheMsgs.push(data);
            if (this._cacheMsgs.length >= startupParam.rpcBulkSize) {
                this.doSend();
            }
        }
        else {
            this._socket.send(data);
        }
    }
}
exports.RpcSession = RpcSession;
//# sourceMappingURL=RpcSession.js.map