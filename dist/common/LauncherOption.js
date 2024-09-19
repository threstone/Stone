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
            this[key] = this.tryGetValue(value);
        }
        global.nodeId = this.nodeId;
        global.env = this.env;
    }
    tryGetValue(value) {
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }
        const num = parseInt(value, 10);
        return Number.isNaN(num) ? value : num;
    }
}
exports.launcherOption = new LauncherOption();
//# sourceMappingURL=LauncherOption.js.map