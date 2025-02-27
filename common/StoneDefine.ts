export enum StoneEvent {
    /** 成功链接到RPC服务器 */
    RpcServerConnected = 'RpcServerConnected',
    /** 集群状态更新 */
    ClusterStatusUpdate = 'ClusterStatusUpdate'
}

export enum RpcRouteType {
    Random,
    Target,
    All,
}