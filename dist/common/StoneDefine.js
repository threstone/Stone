"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcRouteType = exports.StoneEvent = void 0;
var StoneEvent;
(function (StoneEvent) {
    /** 成功链接到RPC服务器 */
    StoneEvent["RpcServerConnected"] = "RpcServerConnected";
    // /** servers配置更新 */
    // ServersConfigUpdate = 'ServersConfigUpdate'
})(StoneEvent || (exports.StoneEvent = StoneEvent = {}));
var RpcRouteType;
(function (RpcRouteType) {
    RpcRouteType[RpcRouteType["Random"] = 0] = "Random";
    RpcRouteType[RpcRouteType["Target"] = 1] = "Target";
    RpcRouteType[RpcRouteType["All"] = 2] = "All";
})(RpcRouteType || (exports.RpcRouteType = RpcRouteType = {}));
//# sourceMappingURL=StoneDefine.js.map