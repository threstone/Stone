import { ServerInit } from "./ServerInit";
import * as path from 'path';
import * as fs from 'fs';

export class ServerLauncher {
    static start() {
        ServerInit.init();
        const serverType = startupParam.serverType;
        if (serverType === 'RPC') {
            require('../rpc/RpcServer');
        } else if (startupParam.nodeId === 'master') {
            require('../master/src/bin/main');
        } else {
            try {
                let mainPath = path.join(process.cwd(), `dist/app/servers/${serverType}/src/bin/main.js`);
                if (fs.existsSync(mainPath) === true) {
                    require(mainPath);
                    return;
                }

                mainPath = path.join(process.cwd(), `app/servers/${serverType}/src/bin/main.js`);
                if (fs.existsSync(mainPath) === true) {
                    require(mainPath);
                    return;
                }

                const dirName = process.cwd().substring(path.join(process.cwd(), '../').length);
                mainPath = path.join(process.cwd(), `dist/${dirName}/app/servers/${serverType}/src/bin/main.js`);
                if (fs.existsSync(mainPath) === true) {
                    require(mainPath);
                    return;
                }

                mainPath = path.join(process.cwd(), `${dirName}/app/servers/${serverType}/src/bin/main.js`);
                if (fs.existsSync(mainPath) === true) {
                    require(mainPath);
                    return;
                }
                logger.warn('找不到入口文件:', mainPath.substring(0, mainPath.length - 3));
            } catch (error) {
                logger.error(`入口文件执行出错`, error);
            }
        }
    }
}

ServerLauncher.start();