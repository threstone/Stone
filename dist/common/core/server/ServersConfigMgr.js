"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServersConfigMgr = void 0;
const fs = require("fs");
const path = require("path");
const StoneDefine_1 = require("../../StoneDefine");
class ServersConfigMgr {
    static init() {
        if (!this._watcher) {
            this._configFilePath = path.join(process.cwd(), '/config/servers.json');
            const serversConfig = require(this._configFilePath);
            this._watcher = fs.watch(this._configFilePath, () => {
                try {
                    const config = require(this._configFilePath);
                    // 删除缓存
                    delete require.cache[this._configFilePath];
                    // 重新require
                    this.ininConfigMap(config);
                    // 派发更新事件
                    eventEmitter.emit(StoneDefine_1.StoneEvent.ServersConfigUpdate);
                    logger.debug('update servers.json');
                }
                catch (error) {
                    logger.error('热更servers配置异常', error.message);
                }
            });
            this.ininConfigMap(serversConfig);
            global.serverConfig = serversConfigMap.get(startupParam.nodeId);
        }
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
}
exports.ServersConfigMgr = ServersConfigMgr;
//# sourceMappingURL=ServersConfigMgr.js.map