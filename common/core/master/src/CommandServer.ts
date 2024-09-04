import * as http from 'http';
import { GlobalVar } from './GlobalVar';
import { RpcManager } from '../../rpc/RpcManager';

export class CommonServer {
    private _httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    constructor() {
        const port = serversConfigMap.get('master')?.port || 1000;
        this._httpServer = http.createServer((req, res) => {
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
        }).listen(port);
        logger.debug(`start common server successfully, port:${port}`);
    }

    private async doHandle(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        if (req.url.startsWith('/list')) {
            await this.list(req, res, data);
        } else if (req.url.startsWith('/kill')) {
            this.kill(req, res, data);
        } else if (req.url.startsWith('/start')) {
            this.start(req, res, data);
        } else if (req.url.startsWith('/restart')) {
            this.restart(req, res, data);
        } else if (req.url.startsWith('/stopAll')) {
            this.stopAll(req, res, data);
        } else {
            res.write('unknow request')
        }
    }

    private async list(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        const result = await GlobalVar.nodeMgr.getServerInfo();
        res.write(result);
    }

    private kill(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        GlobalVar.nodeMgr.serverMap.get((data as any).nodeId)?.kill();
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

    private stopAll(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        res.statusCode = 200;
        logger.info('process exit');
        GlobalVar.nodeMgr.serverMap.forEach((node) => {
            node.kill();
        });
        RpcManager.stopRpcServer();
        this._httpServer.close();
        setTimeout(() => {
            process.exit();
        }, 500);
    }
}