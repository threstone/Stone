import { StoneEvent, RpcRouteType } from "stone-framework";

logger.info('init...');
if (serverConfig.nodeId === 'template1') {
    // 成功连接RPC服务器后测试
    eventEmitter.once(StoneEvent.RpcServerConnected, rpcTest.bind(this));
}
async function rpcTest() {
    const result = await rpc.template.demoRemote.callLog({ type: RpcRouteType.Random }, 'hahaha');
    logger.info(`rpc.template.demoRemote.callLog result:${result}`);

    for (let index = 0; index < 3; index++) {
        rpc.template.demoRemote.sendLog({ type: RpcRouteType.All }, `all hahaha${index}`);
    }

    for (let index = 0; index < 3; index++) {
        rpc.template.demoRemote.sendDelayLog({ type: RpcRouteType.Target, nodeId: 'template2' }, `template2 hahaha${index}`, index * 1000);
    }
}