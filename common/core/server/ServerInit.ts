import { ServersConfigMgr } from "./ServersConfigMgr";
import { RpcManager } from "../rpc/RpcManager";
import { EventEmitter } from 'events';
import { configure, getLogger } from 'log4js';
import { ClusterStateMgr } from "./ClusterStateMgr";
import { LauncherOption } from "../../LauncherOption";

let exceptionLogger: ILog = console as any;
export class ServerInit {
    static init() {
        // 初始化启动参数
        global.startupParam = new LauncherOption(process.argv.splice(2));
        // 初始化全局事件对象
        global.eventEmitter = new EventEmitter();

        // 初始化进程事件
        ServerInit.initProcessEvent();
        // 日志初始化
        ServerInit.initLogger();
        // 初始化service config manager
        ServersConfigMgr.init();
        // 集群状态管理器
        ClusterStateMgr.init();
        // RPC模块初始化
        RpcManager.init();
    }

    private static initProcessEvent() {
        process.on('uncaughtException', (err) => {
            exceptionLogger.error('Caught exception: err:', err);
        });

        process.on('unhandledRejection', (reason, promise) => {
            exceptionLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }

    private static initLogger() {
        const nodeId = startupParam?.nodeId || 'app'
        const pattern = startupParam.logTrace === true ? '%f:%l:%o [%d] [%p] [%c]' : '[%d] [%p] [%c]'
        const loggerConfig = {
            "appenders": {
                "console": {
                    "type": "console",
                    "category": "console",
                    "layout": {
                        "type": "pattern",
                        "pattern": `%[${pattern}%] %m`
                    }
                },
                "debug": {
                    "type": "dateFile",
                    "filename": `./logs/${nodeId}`,
                    "alwaysIncludePattern": true,
                    "pattern": "log",
                    "maxLogSize": 1024 * 1024 * 100,
                    "layout": {
                        "type": "pattern",
                        "pattern": `${pattern} %m`
                    }
                },
                "err": {
                    "type": "dateFile",
                    "filename": `./logs/err`,
                    "alwaysIncludePattern": true,
                    "pattern": "log",//pattern": "yyyy-MM-dd.log",
                    "maxLogSize": 1024 * 1024 * 100,
                    "layout": {
                        "type": "pattern",
                        "pattern": `${pattern} %m`
                    }
                }
            },
            "replaceConsole": true,
            "categories": {
                "default": {
                    "appenders": [
                        // "console",
                        "debug"
                    ],
                    "level": startupParam.logLevel || 'ALL',
                    "enableCallStack": startupParam.logTrace
                },
                [nodeId + ' error']: {
                    "appenders": [
                        "err"
                    ],
                    "level": "error",
                    "enableCallStack": startupParam.logTrace
                }
            }
        };
        if (startupParam.consoleLog) {
            loggerConfig.categories.default.appenders.push('console');
        }
        configure(loggerConfig);
        global.logger = getLogger(nodeId);
        const errLogger = getLogger(nodeId + ' error');
        const saveError = logger.error;
        logger.error = (message: any, ...args: any[]) => {
            errLogger.error(message, ...args);
            saveError.call(logger, message, ...args);
        };
        exceptionLogger = logger;
    }
}