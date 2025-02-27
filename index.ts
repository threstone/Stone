import { ClusterStateMgr as clusterStateMgr } from './common/core/server/ClusterStateMgr';
import { RpcRouteType as rpcRouteType, StoneEvent as stoneEvent } from './common/StoneDefine'
export const RpcRouteType = rpcRouteType;
export const StoneEvent = stoneEvent;
export const getClusterInfo = clusterStateMgr.getClusterInfo.bind(clusterStateMgr);