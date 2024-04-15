"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerInit = void 0;
const LauncherOption_1 = require("../../LauncherOption");
const ServersConfigMgr_1 = require("./ServersConfigMgr");
const serviceConfig = require("../../../config/service.json");
const RpcManager_1 = require("../rpc/RpcManager");
const events_1 = require("events");
const log4js_1 = require("log4js");
class ServerInit {
    static init() {
        // 初始化启动参数
        global.startupParam = LauncherOption_1.launcherOption;
        // 初始化全局事件对象
        global.eventEmitter = new events_1.EventEmitter();
        // 依赖配置
        global.serviceConfig = serviceConfig[startupParam.env];
        // 日志初始化
        ServerInit.initLogger();
        // 初始化service config manager
        ServersConfigMgr_1.ServersConfigMgr.init();
        // RPC模块初始化
        RpcManager_1.RpcManager.init();
    }
    static initLogger() {
        const nodeId = (startupParam === null || startupParam === void 0 ? void 0 : startupParam.nodeId) || 'app';
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
        (0, log4js_1.configure)(loggerConfig);
        global.logger = (0, log4js_1.getLogger)(nodeId);
        const errLogger = (0, log4js_1.getLogger)(nodeId + ' error');
        logger.error = errLogger.error.bind(errLogger);
    }
}
exports.ServerInit = ServerInit;
