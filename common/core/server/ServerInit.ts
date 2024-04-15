import { launcherOption } from "../../LauncherOption";
import { ServersConfigMgr } from "./ServersConfigMgr";
import * as serviceConfig from '../../../config/service.json';
import { RpcManager } from "../rpc/RpcManager";
import { EventEmitter } from 'events';
import { configure, getLogger } from 'log4js';
export class ServerInit {
    static init() {
        // 初始化启动参数
        global.startupParam = launcherOption;
        // 初始化全局事件对象
        global.eventEmitter = new EventEmitter();
        // 依赖配置
        global.serviceConfig = serviceConfig[startupParam.env];
        // 日志初始化
        ServerInit.initLogger();
        // 初始化service config manager
        ServersConfigMgr.init();
        // RPC模块初始化
        RpcManager.init();
    }

    static initLogger() {
        const nodeId = startupParam?.nodeId || 'app'
        const loggerConfig = {
            "appenders": {
                "console": {
                    "type": "console",
                    "category": "console",
                    "layout": {
                        "type": "pattern",
                        "pattern": "%[[%f:%l:%o] [%d] [%p] [%c]%] %m"
                    }
                },
                "debug": {
                    "type": "dateFile",
                    "filename": `./logs/${nodeId}`,
                    "alwaysIncludePattern": true,
                    "pattern": "yyyy-MM-dd.log",
                    "layout": {
                        "type": "pattern",
                        "pattern": "[%f:%l:%o] [%d] [%p] [%c] %m"
                    }
                },
                "err": {
                    "type": "dateFile",
                    "filename": `./logs/err`,
                    "alwaysIncludePattern": true,
                    "pattern": "yyyy-MM-dd.log",
                    "layout": {
                        "type": "pattern",
                        "pattern": "[%f:%l:%o] [%d] [%p] [%c] %m"
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
                    "level": "ALL",
                    "enableCallStack": true
                },
                [nodeId + ' error']: {
                    "appenders": [
                        "console",
                        "err"
                    ],
                    "level": "error",
                    "enableCallStack": true
                }
            }
        };
        configure(loggerConfig);
        global.logger = getLogger(nodeId);
        const errLogger = getLogger(nodeId + ' error');
        logger.error = errLogger.error.bind(errLogger);
    }
}