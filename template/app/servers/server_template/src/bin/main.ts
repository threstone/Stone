import { StoneEvent, RpcRouteType } from "stone-framework";

logger.info('init...');
if (serverConfig.nodeId === 'server_template1') {
    eventEmitter.once(StoneEvent.RpcServerConnected, rpcTest.bind(this));
}
eventEmitter.once(StoneEvent.RpcServerConnected, rpcTest.bind(this));
async function rpcTest() {
    const result = await rpc.server_template.demoRemote.callLog({ type: RpcRouteType.Random }, 'hahaha');
    logger.info(`rpc.server_template.demoRemote.callLog result:${result}`);

    for (let index = 0; index < 3; index++) {
        rpc.server_template.demoRemote.sendLog({ type: RpcRouteType.All }, `hahaha${index}`);
    }

    for (let index = 0; index < 3; index++) {
        rpc.server_template.demoRemote.sendDelayLog({ type: RpcRouteType.Target, nodeId: 'server_template2' }, `hahaha${index}`, index * 1000);
    }
}


