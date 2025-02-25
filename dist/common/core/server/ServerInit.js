"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerInit = void 0;
const LauncherOption_1 = require("../../LauncherOption");
const ServersConfigMgr_1 = require("./ServersConfigMgr");
const RpcManager_1 = require("../rpc/RpcManager");
const events_1 = require("events");
const log4js_1 = require("log4js");
let exceptionLogger = console;
class ServerInit {
    static init() {
        // 初始化启动参数
        global.startupParam = LauncherOption_1.launcherOption;
        // 初始化全局事件对象
        global.eventEmitter = new events_1.EventEmitter();
        // 初始化进程事件
        ServerInit.initProcessEvent();
        // 日志初始化
        ServerInit.initLogger();
        // 初始化service config manager
        ServersConfigMgr_1.ServersConfigMgr.init();
        // RPC模块初始化
        RpcManager_1.RpcManager.init();
    }
    static initProcessEvent() {
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
    static initLogger() {
        var _a, _b;
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
                    "pattern": "log", //pattern": "yyyy-MM-dd.log",
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
                    "enableCallStack": (_a = s.logTrace) !== null && _a !== void 0 ? _a : false
                },
                [nodeId + ' error']: {
                    "appenders": [
                        "console",
                        "err"
                    ],
                    "level": "error",
                    "enableCallStack": (_b = s.logTrace) !== null && _b !== void 0 ? _b : false
                }
            }
        };
        (0, log4js_1.configure)(loggerConfig);
        global.logger = (0, log4js_1.getLogger)(nodeId);
        const errLogger = (0, log4js_1.getLogger)(nodeId + ' error');
        logger.error = errLogger.error.bind(errLogger);
        exceptionLogger = logger;
    }
}
exports.ServerInit = ServerInit;
//# sourceMappingURL=ServerInit.js.map