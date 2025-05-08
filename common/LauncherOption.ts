import { CommonUtils } from "./CommonUtils";

export class LauncherOption implements IServerConfig {

    nodeId: string;
    port: number
    env: string;
    serverType: string;

    autuResume: boolean = false;
    logTrace: boolean = false;
    logLevel: string = 'All';
    consoleLog: boolean = true;
    rpcBulkSize: number = 100;
    rpcBulkTime: number = 10;

    constructor(args: string[]) {
        CommonUtils.getParams(args, this);
        global.nodeId = this.nodeId;
        global.env = this.env;
    }
}