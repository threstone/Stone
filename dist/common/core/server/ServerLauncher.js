"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerLauncher = void 0;
const ServerInit_1 = require("./ServerInit");
const path = require("path");
class ServerLauncher {
    static start() {
        ServerInit_1.ServerInit.init();
        if (startupParam.serverType === 'RPC') {
            require('../rpc/RpcServer');
        }
        else if (startupParam.nodeId === 'master') {
            require('../master/src/bin/main');
        }
        else {
            try {
                require(path.join(process.cwd(), `dist/app/servers/${startupParam.serverType}/src/bin/main`));
            }
            catch (error) {
                require(path.join(process.cwd(), `app/servers/${startupParam.serverType}/src/bin/main`));
            }
        }
    }
}
exports.ServerLauncher = ServerLauncher;
ServerLauncher.start();
//# sourceMappingURL=ServerLauncher.js.map