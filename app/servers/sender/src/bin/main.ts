import { RpcRouteType } from "../../../../..";
setTimeout(async () => {
    logger.info(startupParam.nodeId, 'start')
    const times = 10;
    const now = Date.now();
    for (let index = 0; index < times; index++) {
        await doTest(index + 1);
    }
    console.log(`avg :${(Date.now() - now) / times - 10}`)
}, 5000);


async function doTest(index: number) {
    const times = 50000;//200000  50000
    const tasks = [];
    console.time(`${index} : ${times}`);
    console.time(`${index} : 发送耗时`);
    for (let i = 0; i < times; i++) {
        tasks.push(rpc.handler.demoRemote.callLog({ type: RpcRouteType.Random }, `${i}`).then((res) => {
            if (res !== `${i}`) {
                logger.error('errrrrrrrrrrrr')
            }
        }));
    }
    console.timeEnd(`${index} : 发送耗时`);
    await Promise.all(tasks)
    console.timeEnd(`${index} : ${times}`);
    await new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, 0);
    });
}