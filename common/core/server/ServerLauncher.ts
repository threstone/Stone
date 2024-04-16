import { ServerInit } from "./ServerInit";
import * as path from 'path';

export class ServerLauncher {
    static start() {
        ServerInit.init();
        if (startupParam.serverType === 'RPC') {
            require('../rpc/RpcServer');
        } else if (startupParam.nodeId === 'master') {
            require('../master/src/bin/main');
        } else {
            require(path.join(process.cwd(), `dist/app/servers/${startupParam.serverType}/src/bin/main`));
        }
    }
}

ServerLauncher.start();