declare var nodeId: string;
declare var env: string;
declare var startupParam: IServerConfig

/** 服务器配置map */
declare var serversConfigMap: Map<string, IServerConfig>;
/** 当前服务器配置 */
declare var serverConfig: IServerConfig;
/** 全局事件对象 */
declare var eventEmitter: NodeJS.EventEmitter;
/** 全局logger */
declare var logger: ILog;
/** 获取集群信息,未启动的服务不会在map中 */
declare function getClusterInfo(): Map<string, IServerConfig>;

/** servers.json配置定义 */
declare interface IServerConfig {
    ip?: string
    port?: number
    /**  master专用配置 是否生成rpc描述文件 */
    isCreateRpcDeclare?: boolean
    /** master专用配置 定义rpc服务器的数量及端口 */
    rpcPorts?: number[]
    /** master专用配置 rpc最大缓存消息条数,默认100条 */
    rpcBulkSize?: number
    /** master专用配置 rpc最大缓存时间,默认10毫秒 */
    rpcBulkTime?: number

    /** 节点id */
    nodeId?: string
    /** 环境id */
    env?: string
    /** 节点类型 */
    serverType?: string
    /** 异常重启,默认false */
    autuResume?: boolean
    /** 是否输出堆栈信息,默认false,此功能需要耗费一定性能,线上谨慎开启 */
    logTrace?: boolean
    /** 输出级别,默认All */
    logLevel?: string
    /** 是否输出到控制台,默认true,此功能需要耗费一定性能,线上建议关闭,推荐通过读取日志查看日志而不是控制台 */
    consoleLog?: boolean
    /** 调试端口,配置后会打开对应的端口以方便远程调试 */
    inspectPort?: number
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