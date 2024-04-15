"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launcherOption = void 0;
class LauncherOption {
    constructor() {
        const args = process.argv.splice(2);
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            const kvInfo = arg.split('=');
            const key = kvInfo[0];
            let value = kvInfo[1];
            this[key] = value;
        }
        global.nodeId = this.nodeId;
        global.env = this.env;
    }
    get port() { return this._socketListenPort; }
    set port(value) { this._socketListenPort = parseInt(value); }
    get maxUser() { return this._maxUser; }
    set maxUser(value) { this._maxUser = parseInt(value); }
}
exports.launcherOption = new LauncherOption();
