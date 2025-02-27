"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoRemote = void 0;
class DemoRemote {
    /** 定义一个方法打印参数并返回 */
    log(str) {
        logger.log(str);
        return str;
    }
    /** 在一定时间后打印参数并返回 */
    async delayLog(str, delayTime) {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, delayTime);
        });
        logger.log(str);
        return str;
    }
}
exports.DemoRemote = DemoRemote;
//# sourceMappingURL=DemoRemote.js.map