import * as fs from 'fs';
import * as path from 'path';
import * as serversConfig from '../../../config/servers.json';
export class ServersConfigMgr {

    private static _watcher: fs.FSWatcher;
    private static _configFilePath: string;

    static init() {
        if (!this._watcher) {
            this._configFilePath = path.join(__dirname, '../../../config/servers.json');
            this._watcher = fs.watch(this._configFilePath, () => {
                logger.info('update servers.json');
                // 删除缓存
                delete require.cache[this._configFilePath];
                // 重新require
                require(this._configFilePath);
                this.ininConfigMap(require(this._configFilePath));
                // 派发更新事件
                eventEmitter.emit('serversConfigUpdate')
            });

            this.ininConfigMap(serversConfig);
            global.serverConfig = serversConfigMap.get(startupParam.nodeId);
        }
    }

    static ininConfigMap(configs: any) {
        global.serversConfigMap = new Map<string, ServerConfig>();
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
                const serverConf: ServerConfig = serverConfig[i];
                serverConf.env = env;
                serverConf.serverType = serverName;
                serversConfigMap.set(serverConf.nodeId, serverConf);
            }
        }
    }

    static getServersByType(type: string) {
        const result: ServerConfig[] = [];
        serversConfigMap.forEach((config) => {
            if (config.serverType === type) {
                result.push(config)
            }
        });
        return result;
    }
}