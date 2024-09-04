"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonServer = void 0;
const http = require("http");
const GlobalVar_1 = require("./GlobalVar");
const RpcManager_1 = require("../../rpc/RpcManager");
class CommonServer {
    constructor() {
        var _a;
        const port = ((_a = serversConfigMap.get('master')) === null || _a === void 0 ? void 0 : _a.port) || 1000;
        this._httpServer = http.createServer((req, res) => {
            let datas;
            req.on('data', (d) => {
                !datas && (datas = '');
                datas += d;
            });
            req.on('end', async () => {
                let body;
                try {
                    body = datas && JSON.parse(datas);
                }
                catch (error) {
                }
                await this.doHandle(req, res, body);
                res.end();
            });
        }).listen(port);
        logger.debug(`start common server successfully, port:${port}`);
    }
    async doHandle(req, res, data) {
        if (req.url.startsWith('/list')) {
            await this.list(req, res, data);
        }
        else if (req.url.startsWith('/kill')) {
            this.kill(req, res, data);
        }
        else if (req.url.startsWith('/start')) {
            this.start(req, res, data);
        }
        else if (req.url.startsWith('/restart')) {
            this.restart(req, res, data);
        }
        else if (req.url.startsWith('/stopAll')) {
            this.stopAll(req, res, data);
        }
        else {
            res.write('unknow request');
        }
    }
    async list(req, res, data) {
        const result = await GlobalVar_1.GlobalVar.nodeMgr.getServerInfo();
        res.write(result);
    }
    kill(req, res, data) {
        var _a;
        (_a = GlobalVar_1.GlobalVar.nodeMgr.serverMap.get(data.nodeId)) === null || _a === void 0 ? void 0 : _a.kill();
        res.statusCode = 200;
    }
    start(req, res, data) {
        GlobalVar_1.GlobalVar.nodeMgr.startServer(data.nodeId);
        res.statusCode = 200;
    }
    restart(req, res, data) {
        GlobalVar_1.GlobalVar.nodeMgr.restart(data.nodeId);
        res.statusCode = 200;
    }
    stopAll(req, res, data) {
        res.statusCode = 200;
        logger.info('process exit');
        GlobalVar_1.GlobalVar.nodeMgr.serverMap.forEach((node) => {
            node.kill();
        });
        RpcManager_1.RpcManager.stopRpcServer();
        this._httpServer.close();
        setTimeout(() => {
            process.exit();
        }, 500);
    }
}
exports.CommonServer = CommonServer;
//# sourceMappingURL=CommandServer.js.map