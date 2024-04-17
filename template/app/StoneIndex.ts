declare var nodeId: string;
declare var env: string;
declare var startupParam: ILauncherOption

/** 服务器配置map */
declare var serversConfigMap: Map<string, ServerConfig>;
/** 当前服务器配置 */
declare var serverConfig: ServerConfig;
/** 全局时间对象 */
declare var eventEmitter: NodeJS.EventEmitter;
/** 全局logger */
declare var logger: ILog;

//游戏封包的结构
declare interface IGameMessage {
    cmd: number
    scmd: number
    toJSON(): { [k: string]: any };
}

//启动参数
declare interface ILauncherOption {
    port: number
    maxUser: number
    nodeId: string
    env: string,
    serverType: string
    isTest: boolean
}

declare interface ServerConfig {
    nodeId?: string
    ip?: string
    port?: number
    env?: string
    autuResume?: boolean
    serverType?: string
    isTest?: boolean
    rpcPorts?: number[]
}

//日志记录对象
declare interface ILog {
    trace(...args: any[]): void
    debug(...args: any[]): void
    info(...args: any[]): void
    warn(...args: any[]): void
    error(...args: any[]): void
    fatal(...args: any[]): void
    log(...args: any[]): void
}