
import { NodeMgr } from './NodeMgr';
import { CommonServer } from './CommandServer';
export class GlobalVar {


    public static nodeMgr: NodeMgr;
    public static commonServer: CommonServer;

    static init() {
        logger.info(`[${process.pid}] init ...`);

        // 命令模块
        this.commonServer = new CommonServer();

        // 子进程模块
        this.nodeMgr = new NodeMgr();
        this.nodeMgr.startServers();
    }
}