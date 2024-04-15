"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonServer = void 0;
const Koa = require("koa");
const Router = require("koa-router");
const BodyParser = require("koa-bodyparser");
const master_1 = require("./master");
class CommonServer {
    constructor() {
        var _a;
        const port = ((_a = serversConfigMap.get('master')) === null || _a === void 0 ? void 0 : _a.port) || 1000;
        const app = new Koa();
        app.use(BodyParser());
        this.addRouter(app);
        app.listen(port, () => {
            logger.info(`start common server successfully, port:${port}`);
        });
    }
    addRouter(app) {
        const router = new Router();
        app.use(router.routes());
        router.get('/list', this.list.bind(this));
        router.get('/kill', this.kill.bind(this));
        router.get('/start', this.start.bind(this));
        router.get('/restart', this.restart.bind(this));
        router.get('/stopAll', this.stopAll.bind(this));
    }
    async list(ctx, next) {
        ctx.response.body = master_1.GlobalVar.nodeMgr.getServerInfo();
        await next();
    }
    async kill(ctx, next) {
        var _a;
        const body = ctx.request.body;
        (_a = master_1.GlobalVar.nodeMgr.serverMap.get(body.nodeId)) === null || _a === void 0 ? void 0 : _a.kill();
        ctx.response.status = 200;
        await next();
    }
    async start(ctx, next) {
        const body = ctx.request.body;
        master_1.GlobalVar.nodeMgr.startServer(body.nodeId);
        ctx.response.status = 200;
        await next();
    }
    async restart(ctx, next) {
        const body = ctx.request.body;
        master_1.GlobalVar.nodeMgr.restart(body.nodeId);
        ctx.response.status = 200;
        await next();
    }
    async stopAll(ctx, next) {
        ctx.response.status = 200;
        logger.info('process exit');
        master_1.GlobalVar.nodeMgr.serverMap.forEach((node) => {
            node.kill();
        });
        setTimeout(() => {
            process.exit();
        }, 500);
        await next();
    }
}
exports.CommonServer = CommonServer;
