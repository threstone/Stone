import { RpcRouteType } from "../../StoneDefine";
import { RpcSession } from "./RpcServer";

export enum RpcMessageType {
    call,
    send,
    result
}
/**
 * 要避免json循环引用的问题,如无法避免,引入如下库
 * https://www.npmjs.com/package/json-stringify-safe
 */
export class RpcUtilsByJson {

    private static _randIndex: number = 1;

    /** 转发rpc信息 */
    static transferMessage(jsonStr: string, serverMapList: Map<string, RpcSession[]>, nodeIdMap: Map<string, RpcSession>) {
        const reqMsg = RpcUtilsByJson.decodeRpcMsg(jsonStr);
        switch (reqMsg.type) {
            case RpcMessageType.call:
            case RpcMessageType.send:
                // 转发
                const clients = RpcUtilsByJson.getRouteClient(reqMsg as RpcReqMsg, serverMapList, nodeIdMap);
                clients?.forEach((c) => {
                    c.socket.send(jsonStr);
                });
                break;
            case RpcMessageType.result:
                nodeIdMap.get(reqMsg.fromNodeId)?.socket.send(jsonStr);
                break;
        }
    }

    /** 序列化call请求 */
    static encodeCallReqest(nodeId: string, serverName: string, className: string, funcName: string, requestId: number, routeOption: RpcRouterOptions, args: any[]) {
        return JSON.stringify({
            type: RpcMessageType.call,
            requestId,
            routeOptions: routeOption,
            serverName,
            className,
            funcName,
            fromNodeId: nodeId,
            args
        });
    }

    /** 序列化send请求 */
    static encodeSendReqest(nodeId: string, serverName: string, className: string, funcName: string, routeOption: RpcRouterOptions, args: any[]) {
        return JSON.stringify({
            type: RpcMessageType.send,
            routeOptions: routeOption,
            serverName,
            className,
            funcName,
            fromNodeId: nodeId,
            args
        });
    }

    /** 反序列化rpc 信息,返回rpc请求或结果 */
    static decodeRpcMsg(jsonStr: string): RpcReqMsg | RpcTransferResult {
        const msg = JSON.parse(jsonStr);
        switch (msg.type) {
            case RpcMessageType.call:
            case RpcMessageType.send:
                const rpcReqMsg = msg as RpcReqMsg;
                for (let index = 0; index < rpcReqMsg.args.length; index++) {
                    const arg = rpcReqMsg.args[index];
                    if (arg && arg.type === 'Buffer') {
                        rpcReqMsg.args[index] = Buffer.from(arg);
                    }
                }
                break;
            case RpcMessageType.result:
                const rpcTransferResult = msg as RpcTransferResult;
                if (rpcTransferResult.result && rpcTransferResult.result.type === 'Buffer') {
                    rpcTransferResult.result = Buffer.from(rpcTransferResult.result);
                }
                break;
        }
        return msg;
    }

    /** 序列化结果结构体 */
    static encodeResult(replay: RpcTransferResult): string {
        return JSON.stringify(replay);
    }

    /** 获取转发的clients */
    static getRouteClient(reqMsg: RpcReqMsg, serverMapList: Map<string, RpcSession[]>, nodeIdMap: Map<string, RpcSession>) {
        if (reqMsg.routeOptions.type === RpcRouteType.Target/* target */) {
            const result = nodeIdMap.get(reqMsg.routeOptions.nodeId);
            if (result?.serverType !== reqMsg.serverName) {
                return [];
            }
            return [result];
        } else if (reqMsg.routeOptions.type === RpcRouteType.All/* all */) {
            return serverMapList.get(reqMsg.serverName);
        } else {/* random */
            const nodeList = serverMapList.get(reqMsg.serverName);
            return [nodeList[(this._randIndex++) % nodeList.length]]
        }
    }
}

enum TypeEnum {
    String,
    Number,
    Boolean,
    Undefine,
}

/** 
 * 经过单元测试发现 自定义buffer序列化的速度并没有JSON快特别多,包体更小的优势在内网rpc下可以忽略
 * 反而在易用性上远远比不过JSON,需要将常见数据类型一一手动实现
 * 原因估计是因为nodejs各方法调用的开销过大,JSON由于是内置函数反而调用开销小
 * 综合考虑下来,还是使用JSON来做rpc传输好了
 * 详情测试报告运行npm test查看
 **/
export class RpcUtilsByBuffer {

    private static _randIndex: number = 1;
    private static _sourceBuffer: Buffer = Buffer.alloc(65536);

    /** 序列化参数列表 */
    private static encodeArgs(buffer: Buffer, offset: number, args: any[]) {
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            offset = this.encodeArg(buffer, offset, arg)
        }
        return offset;
    }

    /** 序列化参数 */
    private static encodeArg(buffer: Buffer, offset: number, arg: any) {
        switch (typeof (arg)) {
            case 'string':
                {
                    offset = buffer.writeUint8(TypeEnum.String, offset);
                    // 跨4字节去写,然后得到长度
                    const len = buffer.write(arg, offset + 4, 'utf8');
                    // 将长度写回string前
                    offset = buffer.writeUint32LE(len, offset);
                    return offset + len;
                }
            case 'number':
                {
                    offset = buffer.writeUint8(TypeEnum.Number, offset);
                    return buffer.writeDoubleLE(arg, offset);
                }
            case 'boolean':
                {
                    offset = buffer.writeUint8(TypeEnum.Boolean, offset);
                    return buffer.writeUint8(arg ? 1 : 0, offset);
                }
            case 'undefined':
                {
                    return buffer.writeUint8(TypeEnum.Undefine, offset);
                }
            default:
                throw new Error('不支持的传递类型')
        }
    }

    /** 反序列化参数列表 */
    private static decodeArgs(buffer: Buffer, offset: number) {
        const args = [];
        while (true) {
            if (offset >= buffer.length) {
                break;
            }
            let [result, offsetTemp] = this.decodeArg(buffer, offset);
            args.push(result);
            offset = offsetTemp;
        }
        return args;
    }

    /** 反序列化参数 */
    private static decodeArg(buffer: Buffer, offset: number = 0) {
        let result: any;
        const type = buffer.readUint8(offset);
        offset++;
        switch (type) {
            case TypeEnum.String:
                {
                    const len = buffer.readUint32LE(offset);
                    offset += 4;
                    result = buffer.toString('utf8', offset, offset + len);
                    offset += len;
                    break;
                }
            case TypeEnum.Number:
                {
                    result = buffer.readDoubleLE(offset);
                    offset += 8;
                    break;
                }
            case TypeEnum.Boolean:
                {
                    result = buffer.readUint8(offset) === 1;
                    offset += 1;
                    break;
                }
            case TypeEnum.Undefine:
                {
                    result = undefined;
                }
        }
        return [result, offset];
    }

    /** 序列化call请求 */
    static encodeCallReqest(nodeId: string, serverName: string, className: string, funcName: string, requestId: number, routeOptions: RpcRouterOptions, args: any[]) {
        return RpcUtilsByBuffer.encodeReqMsg({
            type: RpcMessageType.call,
            requestId,
            routeOptions,
            serverName,
            className,
            funcName,
            fromNodeId: nodeId,
            args
        });
    }

    /** 序列化send请求 */
    static encodeSendReqest(nodeId: string, serverName: string, className: string, funcName: string, routeOptions: RpcRouterOptions, args: any[]) {
        return RpcUtilsByBuffer.encodeReqMsg({
            type: RpcMessageType.send,
            routeOptions,
            serverName,
            className,
            funcName,
            fromNodeId: nodeId,
            args
        });
    }

    /** 序列化rpc请求 */
    private static encodeReqMsg(msg: RpcReqMsg): Buffer {
        const buffer = this._sourceBuffer;
        // write type 
        let offset = buffer.writeUint8(msg.type);

        // write requestId 
        offset = buffer.writeDoubleLE(msg.requestId || 0, offset)
        // write route options
        offset = this.writeRouteOptions(msg.routeOptions, buffer, offset);
        // write routeOption.serverName 
        offset = this.writeStrToBuffer(buffer, msg.serverName, offset);
        // write routeOption.className 
        offset = this.writeStrToBuffer(buffer, msg.className, offset);
        // write routeOption.funcName 
        offset = this.writeStrToBuffer(buffer, msg.funcName, offset);

        // write fromNodeId 
        offset = this.writeStrToBuffer(buffer, msg.fromNodeId, offset);
        offset = this.encodeArgs(buffer, offset, msg.args);
        return buffer.slice(0, offset);
    }

    /** 反序列化rpc请求 */
    private static decodeReqMsg(buffer: Buffer): RpcReqMsg {
        const result: RpcReqMsg = {
            type: 0,
            routeOptions: {},
            serverName: "",
            className: "",
            funcName: "",
            fromNodeId: "",
            args: []
        };
        let offset = 0;
        // read type 
        result.type = buffer.readUint8();
        offset++;

        // read requestId 
        result.requestId = buffer.readDoubleLE(offset);
        offset += 8;

        // read route options
        offset = this.readRouteOptions(result.routeOptions, buffer, offset);

        // serverName read
        let len = buffer.readUint32LE(offset);
        offset += 4;
        result.serverName = buffer.toString('utf8', offset, offset + len);
        offset += len;
        // className read
        len = buffer.readUint32LE(offset);
        offset += 4;
        result.className = buffer.toString('utf8', offset, offset + len);
        offset += len;
        // funcName read
        len = buffer.readUint32LE(offset);
        offset += 4;
        result.funcName = buffer.toString('utf8', offset, offset + len);
        offset += len;

        // read fromNodeId 
        len = buffer.readUint32LE(offset);
        offset += 4;
        result.fromNodeId = buffer.toString('utf8', offset, offset + len);
        offset += len;
        result.args = this.decodeArgs(buffer, offset);
        return result;
    }

    /** 所有rpc message的首位都标识信息类型 */
    static getRpcMsgType(buffer: Buffer): RpcMessageType {
        return buffer.readUint8();
    }

    /** 写入路由信息 */
    private static writeRouteOptions(routeOption: RpcRouterOptions, buffer: Buffer, offset: number) {
        // write routeOption.type
        offset = buffer.writeUint8(routeOption.type || 0, offset);
        // write routeOption.nodeId
        offset = this.writeStrToBuffer(buffer, routeOption.nodeId, offset);
        return offset;
    }

    /** 读取roter信息 */
    static readRouteOptions(routeOption: RpcRouterOptions, buffer: Buffer, offset = 9) {
        routeOption.type = buffer.readUint8(offset);
        offset++;
        let len = buffer.readUint32LE(offset);
        offset += 4;
        routeOption.nodeId = buffer.toString('utf8', offset, offset + len);
        offset += len;
        return offset;
    }

    /** 序列化结果结构体 */
    static encodeResult(replay: RpcTransferResult) {
        const buffer = this._sourceBuffer;
        let offset = buffer.writeUint8(replay.type);
        offset = this.writeStrToBuffer(buffer, replay.fromNodeId, offset);
        offset = this.encodeArg(buffer, offset, replay.result);
        if (replay.requestId) {
            // write requestId 
            offset = buffer.writeDoubleLE(replay.requestId || 0, offset)
        }
        return buffer.slice(0, offset);
    }

    /** 反序列化结果结构体 */
    static decodeResult(buffer: Buffer): RpcTransferResult {
        const result: RpcTransferResult = {
            type: 0,
            fromNodeId: "",
            result: undefined
        };
        let offset = 0;
        result.type = buffer.readUint8();
        offset++;

        // fromNodeId read
        let len = buffer.readUint32LE(offset);
        offset += 4;
        result.fromNodeId = buffer.toString('utf8', offset, offset + len);
        offset += len;
        // result read
        const [tempRes, temOffset] = this.decodeArg(buffer, offset);
        offset = temOffset;
        result.result = tempRes;

        // requestId read
        if (offset < buffer.length) {
            result.requestId = buffer.readDoubleLE(offset);
        }
        return result;
    }

    /** 获得rpc返回结果需要给到的node */
    static getResultTo(buffer: Buffer): string {
        return RpcUtilsByBuffer.readStringFromBuffer(buffer, 1);
    }

    /** 将string写入buffer */
    private static writeStrToBuffer(buffer: Buffer, str: string = '', offset: number) {
        const len = buffer.write(str, offset + 4, 'utf8');
        return buffer.writeUint32LE(len, offset) + len;
    }

    /** 从buffer中读取string */
    static readStringFromBuffer(buffer: Buffer, offset: number) {
        const len = buffer.readUint32LE(offset);
        offset += 4;
        return buffer.toString('utf8', offset, offset + len);
    }

    /** 获取转发的clients */
    static getRouteClient(buffer: Buffer, serverMapList: Map<string, RpcSession[]>, nodeIdMap: Map<string, RpcSession>) {
        const routeOptions: RpcRouterOptions = {};
        const offset = RpcUtilsByBuffer.readRouteOptions(routeOptions, buffer);
        const serverName = RpcUtilsByBuffer.readStringFromBuffer(buffer, offset);
        if (routeOptions.type === RpcRouteType.Target/* target */) {
            const result = nodeIdMap.get(routeOptions.nodeId);
            if (result?.serverType !== serverName) {
                return [];
            }
            return [result];
        } else if (routeOptions.type === RpcRouteType.All/* all */) {
            return serverMapList.get(serverName);
        } else {/* random */
            const nodeList = serverMapList.get(serverName);
            return [nodeList[(this._randIndex++) % nodeList.length]]
        }
    }

    /** 转发rpc信息 */
    static transferMessage(buffer: Buffer, serverMapList: Map<string, RpcSession[]>, nodeIdMap: Map<string, RpcSession>) {
        const type = RpcUtilsByBuffer.getRpcMsgType(buffer);
        switch (type) {
            case RpcMessageType.call:
            case RpcMessageType.send:
                // 转发
                const clients = RpcUtilsByBuffer.getRouteClient(buffer, serverMapList, nodeIdMap);
                clients?.forEach((c) => {
                    c.socket.send(buffer);
                });
                break;
            case RpcMessageType.result:
                const nodeId = RpcUtilsByBuffer.getResultTo(buffer);
                nodeIdMap.get(nodeId)?.socket.send(buffer);
                break;
        }
    }

    /** 反序列化rpc 信息,返回rpc请求或结果 */
    static decodeRpcMsg(buffer: Buffer): RpcReqMsg | RpcTransferResult {
        const type: RpcMessageType = buffer.readUint8();
        if (type === RpcMessageType.result) {
            return this.decodeResult(buffer);
        } else {
            return this.decodeReqMsg(buffer);
        }
    }
}

// export const RpcUtils = RpcUtilsByBuffer;
export const RpcUtils = RpcUtilsByJson;
