"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServersConfigMgr = void 0;
const path = require("path");
class ServersConfigMgr {
    static init() {
        this._configFilePath = path.join(process.cwd(), '/config/servers.json');
        const serversConfig = require(this._configFilePath);
        this.ininConfigMap(serversConfig);
        global.serverConfig = serversConfigMap.get(startupParam.nodeId);
    }
    static ininConfigMap(configs) {
        global.serversConfigMap = new Map();
        const env = startupParam.env;
        const serversConfigs = configs[env];
        if (!serversConfigs) {
            logger.error(`缺少启动配置 env:${env}`);
            return;
        }
        const keys = Object.keys(serversConfigs);
        for (let index = 0; index < keys.length; index++) {
            const serverName = keys[index];
            const serverConfig = serversConfigs[serverName];
            if (!Array.isArray(serverConfig)) {
                serverConfig.serverType = serverName;
                serverConfig.env = env;
                serversConfigMap.set(serverName, serverConfig);
                continue;
            }
            for (let i = 0; i < serverConfig.length; i++) {
                const serverConf = serverConfig[i];
                serverConf.env = env;
                serverConf.serverType = serverName;
                serversConfigMap.set(serverConf.nodeId, serverConf);
            }
        }
        // 如果静态配置中没有,则可能是动态添加的服务,将启动参数作为服务器配置添加到配置Map中
        if (!serversConfigMap.has(nodeId)) {
            serversConfigMap.set(nodeId, startupParam);
        }
    }
    static getServersByType(type) {
        const result = [];
        serversConfigMap.forEach((config) => {
            if (config.serverType === type) {
                result.push(config);
            }
        });
        return result;
    }
    static getAllServerTypes() {
        const set = new Set();
        serversConfigMap.forEach((config) => {
            set.add(config.serverType);
        });
        return set;
    }
}
exports.ServersConfigMgr = ServersConfigMgr;
//# sourceMappingURL=ServersConfigMgr.js.map