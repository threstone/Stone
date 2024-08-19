class LauncherOption implements ILauncherOption {

    nodeId: string;
    port: number
    env: string;
    serverType: string;
    autuResume: boolean;
    logTrace: boolean;

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

        global.nodeId = this.nodeId;
        global.env = this.env;
    }
}
export const launcherOption = new LauncherOption();