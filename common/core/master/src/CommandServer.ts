import * as http from 'http';
import { GlobalVar } from './GlobalVar';

export class CommonServer {
    constructor() {
        const port = serversConfigMap.get('master')?.port || 1000;
        http.createServer((req, res) => {
            let datas: string;
            req.on('data', (d) => {
                !datas && (datas = '');
                datas += d;
            })
            req.on('end', () => {
                let body: Object;
                try {
                    body = datas && JSON.parse(datas);
                } catch (error) {

                }
                this.doHandle(req, res, body);
                res.end();
            })
        }).listen(port);
        logger.debug(`start common server successfully, port:${port}`);
    }

    private doHandle(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        if (req.url.startsWith('/list')) {
            this.list(req, res, data);
        } else if (req.url.startsWith('/kill')) {
            this.kill(req, res, data);
        } else if (req.url.startsWith('/start')) {
            this.start(req, res, data);
        } else if (req.url.startsWith('/restart')) {
            this.restart(req, res, data);
        } else if (req.url.startsWith('/stopAll')) {
            this.stopAll(req, res, data);
        }else{
            res.write('unknow request')
        }
    }

    private list(req: http.IncomingMessage, res: http.ServerResponse, data: object) {
        res.write(JSON.stringify(GlobalVar.nodeMgr.getServerInfo()));
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
        })
        setTimeout(() => {
            process.exit();
        }, 500);
    }
}