import * as ChildProcess from 'child_process';
import EventEmitter = require('events');
export class BaseWorker extends EventEmitter {

    protected _execPath: string;
    private _options: ChildProcess.ForkOptions;

    serverConfig: ServerConfig;
    worker: ChildProcess.ChildProcess;
    exitedAfterKill: boolean = false;

    get pid() { return this.worker?.pid }

    constructor(execPath: string, serverConfig: ServerConfig) {
        super();
        this._execPath = execPath;
        this.serverConfig = serverConfig;
    }

    fork(options?: ChildProcess.ForkOptions) {
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
        } catch (error) {
            logger.error(`kill the ${this.serverConfig.nodeId} worker${this.worker.pid} got a error:\n`, error)
        }
    }

    restart(serverConfig: ServerConfig) {
        if (serverConfig !== this.serverConfig) {
            this.serverConfig = serverConfig;
        }
        this.kill();
        setTimeout(() => {
            this.fork();
        }, 2000);
    }

    onExit(code: number, signal: string) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} exit code: ${code}, signal: ${signal}, exitedAfterKill: ${this.exitedAfterKill}`);
        this.worker.removeAllListeners();
        if (!this.exitedAfterKill && this.serverConfig.autuResume) {
            setTimeout(() => {
                logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} was exited, resume a new ${this.serverConfig.nodeId}`)
                this.startWorker();
            }, 5000);
        }
    }

    onError(error: Error) {
        logger.error(`the ${this.serverConfig.nodeId} worker${this.worker.pid} got error: ${error}`);
    }

    onMessage(message: any) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} message: ${message}`);
        if (message.event) {
            this.emit(message.event, message.data);
        }
    }

    sendMessage(message: any) {
        this.worker.send(message);
    }

    protected startWorker() {
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