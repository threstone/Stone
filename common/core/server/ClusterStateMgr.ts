import { StoneEvent } from "../../StoneDefine";

/** 用来查看集群状态的管理器 */
export class ClusterStateMgr {

    private static serverMap: Map<string, IServerConfig>;

    static init() {
        if (startupParam.nodeId === 'master') {
            return;
        }
        this.serverMap = new Map();
        global.getClusterInfo = this.getClusterInfo.bind(this);

        const eventMap = new Map([
            ['getChildInfo', this.getChildInfo.bind(this)],
            ['clusterInfo', this.initClusterInfo.bind(this)]
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
}