"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonServer = void 0;
const http = require("http");
const GlobalVar_1 = require("./GlobalVar");
const RpcManager_1 = require("../../rpc/RpcManager");
class CommonServer {
    constructor() {
        const port = (serverConfig === null || serverConfig === void 0 ? void 0 : serverConfig.port) || 1000;
        this._httpServer = http.createServer((req, res) => {
            const remoteAddr = req.socket.remoteAddress;
            if (remoteAddr !== '127.0.0.1' && remoteAddr !== '::1' && remoteAddr !== '::ffff:127.0.0.1') {
                res.statusCode = 403;
                res.end('Forbidden');
                logger.warn(`CommandServer: rejected request from ${remoteAddr}`);
                return;
            }
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
        }).listen(port, '127.0.0.1');
        logger.debug(`start common server successfully, port:${port} (localhost only)`);
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
        else if (req.url.startsWith('/restartAll')) {
            this.restartAll(req, res, data);
        }
        else if (req.url.startsWith('/stopAll')) {
            this.stopAll(req, res, data);
        }
        else if (req.url.startsWith('/restart')) {
            this.restart(req, res, data);
        }
        else if (req.url.startsWith('/add')) {
            this.add(req, res, data);
        }
        else {
            res.write('unknown request');
        }
    }
    async list(req, res, data) {
        const result = await GlobalVar_1.GlobalVar.nodeMgr.getServerInfoStr();
        res.write(result);
    }
    kill(req, res, data) {
        GlobalVar_1.GlobalVar.nodeMgr.kill(data.nodeId);
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
    add(req, res, data) {
        GlobalVar_1.GlobalVar.nodeMgr.add(data.params);
        res.statusCode = 200;
    }
    restartAll(req, res, data) {
        GlobalVar_1.GlobalVar.nodeMgr.restartAll();
        res.statusCode = 200;
    }
    stopAll(req, res, data) {
        res.statusCode = 200;
        logger.info('process exit');
        // 收集所有仍在运行的子进程，注册 exit 监听后再发 kill 信号
        // 注意：不能调用 node.kill()，因为其内部 removeAllListeners() 会清掉我们注册的监听器
        const exitPromises = [];
        GlobalVar_1.GlobalVar.nodeMgr.serverMap.forEach((node) => {
            const worker = node.worker;
            if (worker && worker.exitCode === null && worker.signalCode === null) {
                exitPromises.push(new Promise((resolve) => {
                    worker.once('exit', () => resolve());
                }));
                try {
                    worker.kill();
                }
                catch (error) {
                    logger.error(`kill worker error: ${node.serverConfig.nodeId}`, error);
                }
            }
        });
        GlobalVar_1.GlobalVar.nodeMgr.serverMap.clear();
        RpcManager_1.RpcManager.stopRpcServer();
        this._httpServer.close();
        const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
        Promise.race([Promise.all(exitPromises), timeout]).then(() => {
            logger.info('all workers exited, process.exit()');
            process.exit();
        });
    }
}
exports.CommonServer = CommonServer;
//# sourceMappingURL=CommandServer.js.map