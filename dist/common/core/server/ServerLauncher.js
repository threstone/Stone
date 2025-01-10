"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerLauncher = void 0;
const ServerInit_1 = require("./ServerInit");
const path = require("path");
const fs = require("fs");
class ServerLauncher {
    static start() {
        ServerInit_1.ServerInit.init();
        const serverType = startupParam.serverType;
        if (serverType === 'RPC') {
            require('../rpc/RpcServer');
        }
        else if (startupParam.nodeId === 'master') {
            require('../master/src/bin/main');
        }
        else {
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
            }
            catch (error) {
                logger.error(`入口文件执行出错`, error);
            }
        }
    }
}
exports.ServerLauncher = ServerLauncher;
ServerLauncher.start();
//# sourceMappingURL=ServerLauncher.js.map