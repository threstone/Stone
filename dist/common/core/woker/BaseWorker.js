"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWorker = void 0;
const ChildProcess = require("child_process");
const EventEmitter = require("events");
class BaseWorker extends EventEmitter {
    get pid() { var _a; return (_a = this.worker) === null || _a === void 0 ? void 0 : _a.pid; }
    constructor(execPath, serverConfig) {
        super();
        this.exitedAfterKill = false;
        this._execPath = execPath;
        this.serverConfig = serverConfig;
    }
    fork(options) {
        if (!this._execPath) {
            logger.error(`${this.serverConfig.nodeId} no execPath`);
            return;
        }
        this.exitedAfterKill = false;
        this._options = options || this._options;
        this.startWorker();
    }
    kill() {
        try {
            logger.info(`kill the ${this.serverConfig.nodeId} worker${this.worker.pid}`);
            this.exitedAfterKill = true;
            process.kill(this.worker.pid);
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
        setTimeout(() => {
            this.fork();
        }, 2000);
    }
    onExit(code, signal) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} exit code: ${code}, signal: ${signal}, exitedAfterKill: ${this.exitedAfterKill}`);
        this.worker.removeAllListeners();
        if (!this.exitedAfterKill && this.serverConfig.autuResume) {
            setTimeout(() => {
                logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} was exited, resume a new ${this.serverConfig.nodeId}`);
                this.startWorker();
            }, 5000);
        }
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
}
exports.BaseWorker = BaseWorker;
//# sourceMappingURL=BaseWorker.js.map