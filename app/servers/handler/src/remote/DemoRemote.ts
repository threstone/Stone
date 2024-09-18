
let c = 0;
export class DemoRemote {
    /** 定义一个方法打印参数并返回 */
    log(str: string): string {
        c++;
        if(c === 50000){
            logger.log('end')
        }
        return str;
    }

    /** 在一定时间后打印参数并返回 */
    async delayLog(str: string, delayTime: number): Promise<string> {
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, delayTime);
        })
        logger.log(str);
        return str;
    }
}