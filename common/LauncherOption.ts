class LauncherOption implements ILauncherOption {

    nodeId: string;
    port: number
    env: string;
    serverType: string;
    autuResume: boolean;
    logTrace: boolean;
    rpcBulkSize?: number;
    rpcBulkTime?: number;

    constructor() {
        const args = process.argv.splice(2);
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            const kvInfo = arg.split('=');
            const key: string = kvInfo[0];
            let value: string | number = kvInfo[1];
            this[key] = value;
        }
        const anyThis = this as any;
        this.autuResume = anyThis['autuResume'] === 'true';
        this.logTrace = anyThis['logTrace'] === 'true';

        if (this.rpcBulkSize) { this.rpcBulkSize = parseInt(this.rpcBulkSize as any, 10) }
        if (this.rpcBulkTime) { this.rpcBulkTime = parseInt(this.rpcBulkTime as any, 10) }
        
        global.nodeId = this.nodeId;
        global.env = this.env;
    }
}
export const launcherOption = new LauncherOption();