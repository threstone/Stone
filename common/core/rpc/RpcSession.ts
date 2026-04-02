import * as WS from "ws"

export class RpcSession {
    private _socket: WS;
    isInit: boolean;
    serverType: string;
    nodeId: string;

    private _isCahce: boolean = false;
    private _cacheMsgs: string[];
    private _bulkTimer: NodeJS.Timeout;

    constructor(socket: WS) {
        this._socket = socket;
        this.isInit = false;
        if (startupParam.rpcBulkTime !== 0) {
            this._cacheMsgs = [];
            this._isCahce = true;
            this._bulkTimer = setInterval(this.doSend.bind(this), startupParam.rpcBulkTime);
        }
    }

    public destroy() {
        if (this._bulkTimer) {
            clearInterval(this._bulkTimer);
        }
    }

    private doSend() {
        if (this._cacheMsgs.length === 0) {
            return;
        }
        this._socket.send(JSON.stringify(this._cacheMsgs));
        this._cacheMsgs = [];
    }

    send(data: string) {
        if (this._isCahce) {
            this._cacheMsgs.push(data);
            if (this._cacheMsgs.length >= startupParam.rpcBulkSize) {
                this.doSend();
            }
        } else {
            this._socket.send(data);
        }
    }
}