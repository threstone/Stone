class LauncherOption implements ILauncherOption {

    private _maxUser: number;
    get maxUser() { return this._maxUser; }
    set maxUser(value: number) { this._maxUser = parseInt(value as any); }

    nodeId: string;
    port: number
    env: string;
    serverType: string;
    isTest: boolean;

    constructor() {
        const args = process.argv.splice(2);
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            const kvInfo = arg.split('=');
            const key: string = kvInfo[0];
            let value: string | number = kvInfo[1];
            this[key] = value;
        }
        global.nodeId = this.nodeId;
        global.env = this.env;
    }
}
export const launcherOption = new LauncherOption();