import { StoneEvent } from "../../StoneDefine";

/** 用来查看集群状态的管理器 */
export class ClusterStateMgr {

    private static serverMap: Map<string, IServerConfig>;
    private static serverInfoReq: ServerInfoReq;
    private static serverInfoRequestId: number = 1;

    static init() {
        if (startupParam.nodeId === 'master') {
            return;
        }
        this.serverMap = new Map();
        global.getClusterInfo = this.getClusterInfo.bind(this);
        global.getServerInfo = this.getServerInfo.bind(this);

        const eventMap = new Map([
            ['getChildInfo', this.getChildInfo.bind(this)],
            ['clusterInfo', this.initClusterInfo.bind(this)],
            ['serverInfo', this.onServerInfo.bind(this)]
        ]);
        process.on('message', (message) => {
            eventMap.get(message.event)?.(message);
        });
    }

    private static getChildInfo() {
        const memoryUsage = process.memoryUsage();
        process.send({ event: 'childInfo', data: { memoryUsage, uptime: process.uptime() } });
    }

    private static initClusterInfo(message: any) {
        this.serverMap.clear();
        message.info.forEach((nodeInfo: { nodeId: string, serverConfig: IServerConfig }) => {
            this.serverMap.set(nodeInfo.nodeId, nodeInfo.serverConfig);
            // 配置Map中没有则说明是动态添加的服务,添加配置到Map中
            if (!serversConfigMap.has(nodeInfo.nodeId)) {
                serversConfigMap.set(nodeInfo.nodeId, nodeInfo.serverConfig)
            }
        });
        eventEmitter.emit(StoneEvent.ClusterStatusUpdate, this.serverMap);
    }

    static getClusterInfo() {
        return this.serverMap;
    }

    static getServerInfo(): Promise<IServerInfoMap> {
        if (this.serverInfoReq) {
            return this.serverInfoReq.promise;
        }
        if (!process.send) {
            return Promise.reject(new Error('process.send is not available'));
        }

        const requestId = this.serverInfoRequestId;
        this.serverInfoRequestId = this.serverInfoRequestId >= Number.MAX_SAFE_INTEGER ? 1 : this.serverInfoRequestId + 1;
        let resolveReq: (data: IServerInfoMap) => void;
        let rejectReq: (error: Error) => void;
        const promise = new Promise<IServerInfoMap>((resolve, reject) => {
            resolveReq = resolve;
            rejectReq = reject;
        });
        const timer = setTimeout(() => {
            this.serverInfoReq = null;
            rejectReq(new Error('getServerInfo timeout'));
        }, 15000);
        this.serverInfoReq = { requestId, promise, resolve: resolveReq, reject: rejectReq, timer };
        process.send({ event: 'getServerInfo', requestId });
        return promise;
    }

    private static onServerInfo(message: { requestId: number, data?: IServerInfoMap, error?: string }) {
        const request = this.serverInfoReq;
        if (!request || request.requestId !== message.requestId) {
            return;
        }
        clearTimeout(request.timer);
        this.serverInfoReq = null;
        if (message.error) {
            request.reject(new Error(message.error));
        } else {
            request.resolve(message.data);
        }
    }
}

interface ServerInfoReq {
    requestId: number;
    promise: Promise<IServerInfoMap>;
    resolve: (data: IServerInfoMap) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}
