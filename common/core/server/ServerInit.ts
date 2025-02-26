import { launcherOption } from "../../LauncherOption";
import { ServersConfigMgr } from "./ServersConfigMgr";
import { RpcManager } from "../rpc/RpcManager";
import { EventEmitter } from 'events';
import { configure, getLogger } from 'log4js';

let exceptionLogger: ILog = console as any;
export class ServerInit {
    static init() {
        // 初始化启动参数
        global.startupParam = launcherOption;
        // 初始化全局事件对象
        global.eventEmitter = new EventEmitter();

        // 初始化进程事件
        ServerInit.initProcessEvent();
        // 日志初始化
        ServerInit.initLogger();
        // 初始化service config manager
        ServersConfigMgr.init();
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

        process.on('message', (message) => {
            if (message === 'getChildInfo') {
                const memoryUsage = process.memoryUsage();
                process.send({ event: 'getChildInfo', data: { memoryUsage, uptime: process.uptime() } });
            }
        });
    }

    private static initLogger() {
        const s = startupParam as any;
        const nodeId = startupParam?.nodeId || 'app'
        const pattern = s.logTrace === true ? '%f:%l:%o [%d] [%p] [%c]' : '[%d] [%p] [%c]'
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
                        "console",
                        "debug"
                    ],
                    "level": s.logLevel || 'ALL',
                    "enableCallStack": s.logTrace ?? false
                },
                [nodeId + ' error']: {
                    "appenders": [
                        "console",
                        "err"
                    ],
                    "level": "error",
                    "enableCallStack": s.logTrace ?? false
                }
            }
        };
        configure(loggerConfig);
        global.logger = getLogger(nodeId);
        const errLogger = getLogger(nodeId + ' error');
        logger.error = errLogger.error.bind(errLogger);
        exceptionLogger = logger;
    }
}