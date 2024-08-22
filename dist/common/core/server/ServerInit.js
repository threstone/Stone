"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerInit = void 0;
const LauncherOption_1 = require("../../LauncherOption");
const ServersConfigMgr_1 = require("./ServersConfigMgr");
const RpcManager_1 = require("../rpc/RpcManager");
const events_1 = require("events");
const log4js_1 = require("log4js");
class ServerInit {
    static init() {
        // 初始化启动参数
        global.startupParam = LauncherOption_1.launcherOption;
        // 初始化全局事件对象
        global.eventEmitter = new events_1.EventEmitter();
        // 初始化service config manager
        ServersConfigMgr_1.ServersConfigMgr.init();
        // 日志初始化
        ServerInit.initLogger();
        // RPC模块初始化
        RpcManager_1.RpcManager.init();
    }
    static initLogger() {
        const s = startupParam;
        const nodeId = (startupParam === null || startupParam === void 0 ? void 0 : startupParam.nodeId) || 'app';
        const pattern = s.logTrace === true ? '%f:%l:%o [%d] [%p] [%c]' : '[%d] [%p] [%c]';
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
                    "pattern": "log",
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
                    "enableCallStack": s.logTrace
                },
                [nodeId + ' error']: {
                    "appenders": [
                        "console",
                        "err"
                    ],
                    "level": "error",
                    "enableCallStack": s.logTrace
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
//# sourceMappingURL=ServerInit.js.map