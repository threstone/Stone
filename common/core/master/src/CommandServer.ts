import * as http from 'http';
import { GlobalVar } from './GlobalVar';
import { RpcManager } from '../../rpc/RpcManager';

export class CommonServer {
    private _httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    constructor() {
        const port = serversConfigMap.get('master')?.port || 1000;
        this._httpServer = http.createServer((req, res) => {
            const remoteAddr = req.socket.remoteAddress;
            if (remoteAddr !== '127.0.0.1' && remoteAddr !== '::1' && remoteAddr !== '::ffff:127.0.0.1') {
                res.statusCode = 403;
                res.end('Forbidden');
                logger.warn(`CommandServer: rejected request from ${remoteAddr}`);
                return;
            }
            let datas: string;
            req.on('data', (d) => {
                !datas && (datas = '');
                datas += d;
            })
            req.on('end', async () => {
                let body: Object;
                try {
                    body = datas && JSON.parse(datas);
                } catch (error) {

                }
                await this.doHandle(req, res, body);
                res.end();
            })
        }).listen(port, '127.0.0.1');
        logger.debug(`start common server successfully, port:${port} (localhost only)`);
    }

    private async doHandle(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        if (req.url.startsWith('/list')) {
            await this.list(req, res, data);
        } else if (req.url.startsWith('/kill')) {
            this.kill(req, res, data);
        } else if (req.url.startsWith('/start')) {
            this.start(req, res, data);
        } else if (req.url.startsWith('/restartAll')) {
            this.restartAll(req, res, data);
        } else if (req.url.startsWith('/stopAll')) {
            this.stopAll(req, res, data);
        } else if (req.url.startsWith('/restart')) {
            this.restart(req, res, data);
        } else if (req.url.startsWith('/add')) {
            this.add(req, res, data);
        } else {
            res.write('unknow request')
        }
    }

    private async list(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        const result = await GlobalVar.nodeMgr.getServerInfo();
        res.write(result);
    }

    private kill(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        GlobalVar.nodeMgr.kill((data as any).nodeId);
        res.statusCode = 200;
    }

    private start(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        GlobalVar.nodeMgr.startServer((data as any).nodeId);
        res.statusCode = 200;
    }

    private restart(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        GlobalVar.nodeMgr.restart((data as any).nodeId);
        res.statusCode = 200;
    }

    private add(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        GlobalVar.nodeMgr.add((data as any).params);
        res.statusCode = 200;
    }

    private restartAll(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        GlobalVar.nodeMgr.restartAll();
        res.statusCode = 200;
    }

    private stopAll(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        res.statusCode = 200;
        logger.info('process exit');

        // 收集所有仍在运行的子进程，注册 exit 监听后再发 kill 信号
        // 注意：不能调用 node.kill()，因为其内部 removeAllListeners() 会清掉我们注册的监听器
        const exitPromises: Promise<void>[] = [];
        GlobalVar.nodeMgr.serverMap.forEach((node) => {
            const worker = node.worker;
            if (worker && worker.exitCode === null && worker.signalCode === null) {
                exitPromises.push(new Promise<void>((resolve) => {
                    worker.once('exit', () => resolve());
                }));
                try {
                    worker.kill();
                } catch (error) {
                    logger.error(`kill worker error: ${node.serverConfig.nodeId}`, error);
                }
            }
        });
        GlobalVar.nodeMgr.serverMap.clear();

        RpcManager.stopRpcServer();
        this._httpServer.close();

        const timeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
        Promise.race([Promise.all(exitPromises), timeout]).then(() => {
            logger.info('all workers exited, process.exit()');
            process.exit();
        });
    }
}