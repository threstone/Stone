"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWorker = void 0;
const ChildProcess = require("child_process");
const EventEmitter = require("events");
const CommonUtils_1 = require("../../CommonUtils");
class BaseWorker extends EventEmitter {
    get pid() { var _a; return (_a = this.worker) === null || _a === void 0 ? void 0 : _a.pid; }
    constructor(execPath, serverConfig) {
        super();
        this._execPath = execPath;
        this.serverConfig = serverConfig;
    }
    fork(options) {
        if (!this._execPath) {
            logger.error(`${this.serverConfig.nodeId} no execPath`);
            return;
        }
        this._options = options || this._options;
        this.startWorker();
    }
    kill() {
        try {
            logger.info(`kill the ${this.serverConfig.nodeId} worker${this.worker.pid}`);
            this.worker.kill();
            this.worker.removeAllListeners();
        }
        catch (error) {
            logger.error(`kill the ${this.serverConfig.nodeId} worker${this.worker.pid} got a error:\n`, error);
        }
    }
    restart(serverConfig) {
        if (serverConfig !== this.serverConfig) {
            this.serverConfig = serverConfig;
        }
        this.kill();
        this.fork();
    }
    onExit(code, signal) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} exit code: ${code}, signal: ${signal}`);
        this.worker.removeAllListeners();
        setTimeout(() => {
            if (this.serverConfig.autuResume) {
                logger.info(`the ${this.serverConfig.nodeId} worker was exited, resume a new ${this.serverConfig.nodeId}`);
                this.fork();
            }
        }, 1000);
    }
    onError(error) {
        logger.error(`the ${this.serverConfig.nodeId} worker${this.worker.pid} got error: ${error}`);
    }
    onMessage(message) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} message: ${message}`);
        if (message.event) {
            this.emit(message.event, message.data);
        }
    }
    sendMessage(message) {
        this.worker.send(message);
    }
    startWorker() {
        const args = [];
        const keys = Object.keys(this.serverConfig);
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            args.push(`${key}=${this.serverConfig[key]}`);
        }
        const worker = ChildProcess.fork(this._execPath, args, this._options);
        this.worker = worker;
        worker.on('exit', this.onExit.bind(this));
        worker.on('error', this.onError.bind(this));
        worker.on('message', this.onMessage.bind(this));
    }
    async getWokerMessage(node, maxLens, datas) {
        const info = await this.getWorkerInfo(node);
        const childData = {
            pid: node.pid.toString(),
            nodeId: node.serverConfig.nodeId,
            serverType: node.serverConfig.serverType,
            rss: CommonUtils_1.CommonUtils.formatMemory(info.memoryUsage.rss),
            heapTotal: CommonUtils_1.CommonUtils.formatMemory(info.memoryUsage.heapTotal),
            heapUsed: CommonUtils_1.CommonUtils.formatMemory(info.memoryUsage.heapUsed),
            runTime: (info.uptime / 60).toFixed(2)
        };
        Object.keys(childData).forEach((key) => {
            maxLens[key] = Math.max(childData[key].length + 2, maxLens[key]);
        });
        if (datas[node.serverConfig.serverType] == null) {
            datas[node.serverConfig.serverType] = [];
        }
        datas[node.serverConfig.serverType].push(childData);
    }
    getWorkerInfo(node) {
        let timer;
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage('getChildInfo');
                node.once('getChildInfo', (data) => {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    data.pid = node.pid;
                    resolve(data);
                });
            }),
            new Promise((resolve) => {
                timer = setTimeout(() => {
                    timer = null;
                    resolve({
                        pid: node.pid,
                        memoryUsage: {
                            rss: 0,
                            heapTotal: 0,
                            heapUsed: 0,
                            external: 0,
                            arrayBuffers: 0,
                        },
                        uptime: 0
                    });
                }, 5000);
            })
        ]);
    }
}
exports.BaseWorker = BaseWorker;
//# sourceMappingURL=BaseWorker.js.map