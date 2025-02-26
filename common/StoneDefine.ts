export enum StoneEvent{
    /** 成功链接到RPC服务器 */
    RpcServerConnected = 'RpcServerConnected',
    // /** servers配置更新 */
    // ServersConfigUpdate = 'ServersConfigUpdate'
}

export enum RpcRouteType{
    Random,
    Target,
    All,
}