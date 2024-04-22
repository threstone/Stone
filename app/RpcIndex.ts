
declare interface RpcRouterOptions {
    type?: number | 0/* random */ | 1/* target */ | 2/* all */;
    nodeId?: string;
}
        
declare class rpc {
    static server_template: typeof Server_template;
    static testServer1: typeof TestServer1;
    static testServer2: typeof TestServer2;
}

declare class Server_template {
    static demoRemote: typeof Server_template_DemoRemote;
}

declare class TestServer1 {
}

declare class TestServer2 {
}

declare class Server_template_DemoRemote {
    static callLog(routeOption: RpcRouterOptions, str: string): Promise<string>;
    static sendLog(routeOption: RpcRouterOptions, str: string): void;
    static callDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): Promise<string>;
    static sendDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): void;
}
