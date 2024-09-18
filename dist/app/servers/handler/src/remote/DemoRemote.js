"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoRemote = void 0;
let c = 0;
class DemoRemote {
    /** 定义一个方法打印参数并返回 */
    log(str) {
        c++;
        if (c === 50000) {
            logger.log('end');
        }
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