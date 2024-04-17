
/** rpc 请求结构 */
declare interface RpcReqMsg {
    // rpc server根据type来决定作何操作
    type: number;
    requestId?: number;
    routeOptions: RpcRouterOptions;
    serverName: string;
    className: string;
    funcName: string;
    fromNodeId: string;
    args: any[];
}

/** rpc 转发信息的返回结构 */
declare interface RpcTransferResult {
    // rpc server根据type来决定作何操作
    type: number;
    fromNodeId: string;
    result: any;
    requestId?: number;
}

declare interface RpcRouterOptions {
    type?: number | 0/* random */ | 1/* target */ | 2/* all */;
    nodeId?: string;
}
        
declare class rpc {
    static server_template: typeof Server_template;
}

declare class Server_template {
    static demoRemote: typeof Server_template_DemoRemote;
}

declare class Server_template_DemoRemote {
    static callLog(routeOption: RpcRouterOptions, str: string): Promise<string>;
    static sendLog(routeOption: RpcRouterOptions, str: string): void;
    static callDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): Promise<string>;
    static sendDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): void;
}
