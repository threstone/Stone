import * as ChildProcess from 'child_process';
import { CommonUtils } from '../../CommonUtils';
export class BaseWorker {

    protected _execPath: string;
    private _options: ChildProcess.ForkOptions;

    serverConfig: IServerConfig;
    worker: ChildProcess.ChildProcess;

    get pid() { return this.worker?.pid }

    constructor(execPath: string, serverConfig: IServerConfig) {
        this._execPath = execPath;
        this.serverConfig = serverConfig;
    }

    fork(options?: ChildProcess.ForkOptions) {
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
        } catch (error) {
            logger.error(`kill the ${this.serverConfig.nodeId} worker${this.worker.pid} got a error:\n`, error)
        }
    }

    restart(serverConfig: IServerConfig) {
        if (serverConfig !== this.serverConfig) {
            this.serverConfig = serverConfig;
        }
        this.kill();
        this.fork();
    }


    onExit(code: number, signal: string) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} exit code: ${code}, signal: ${signal}`);
        this.worker.removeAllListeners();
        setTimeout(() => {
            if (this.serverConfig.autuResume) {
                logger.info(`the ${this.serverConfig.nodeId} worker was exited, resume a new ${this.serverConfig.nodeId}`)
                this.fork();
            }
        }, 1000);
    }

    onError(error: Error) {
        logger.error(`the ${this.serverConfig.nodeId} worker${this.worker.pid} got error: ${error}`);
    }

    onMessage(message: any) {
        logger.info(`the ${this.serverConfig.nodeId} worker${this.worker.pid} message: ${message}`);
        if (message.event) {
            this.worker.emit(message.event, message.data);
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

    async getWokerMessage(node: BaseWorker, maxLens: {}, datas: {}) {
        const info = await this.getWorkerInfo(node) as { memoryUsage: NodeJS.MemoryUsage, uptime: number, pid: number };
        const childData = {
            pid: node.pid.toString(),
            nodeId: node.serverConfig.nodeId,
            serverType: node.serverConfig.serverType,
            rss: CommonUtils.formatMemory(info.memoryUsage.rss),
            heapTotal: CommonUtils.formatMemory(info.memoryUsage.heapTotal),
            heapUsed: CommonUtils.formatMemory(info.memoryUsage.heapUsed),
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

    private getWorkerInfo(node: BaseWorker) {
        let timer: NodeJS.Timeout;
        return Promise.race([
            new Promise((resolve) => {
                node.sendMessage({ event: 'getChildInfo' });
                node.worker.once('childInfo', (data: { memoryUsage: NodeJS.MemoryUsage, uptime: number, pid: number }) => {
                    if (timer) { clearTimeout(timer); }
                    data.pid = node.pid;
                    resolve(data);
                });
            }),
            new Promise<any>((resolve) => {
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
            })])
    }
}