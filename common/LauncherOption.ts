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
            this[key] = this.tryGetValue(value);
        }

        global.nodeId = this.nodeId;
        global.env = this.env;
    }

    private tryGetValue(value: string) {
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }

        const num = parseInt(value, 10);
        return Number.isNaN(num) ? value : num;
    }
}
export const launcherOption = new LauncherOption();