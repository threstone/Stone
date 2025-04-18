"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcManager = void 0;
const fs = require("fs");
const path = require("path");
const CommonUtils_1 = require("../../CommonUtils");
const BaseWorker_1 = require("../woker/BaseWorker");
const RpcClient_1 = require("./RpcClient");
const StoneDefine_1 = require("../../StoneDefine");
class RpcManager {
    static init() {
        this.doMasterTask();
        this.initRpcModule();
        this.initRpcClient();
    }
    static stopRpcServer() {
        if (startupParam.nodeId !== 'master') {
            return;
        }
        this._serverWorker.forEach((rpcWorker) => {
            rpcWorker.kill();
        });
    }
    /** 执行master任务 */
    static doMasterTask() {
        if (startupParam.nodeId !== 'master') {
            return;
        }
        this.initRpcDeclare();
        this.initRpcServers();
    }
    static getClient() {
        if (!this._clients) {
            return;
        }
        const len = this._clients.length;
        for (let index = 0; index < len; index++) {
            const clientIndex = (++this._index) % len;
            const c = this._clients[clientIndex];
            if (c.isClose === false) {
                return c;
            }
        }
    }
    /** 是否是server */
    static isServer() {
        return (startupParam.nodeId !== 'master' && serversConfigMap.has(startupParam.nodeId));
    }
    /** 启动rpc服务器 */
    static initRpcServers() {
        this._serverWorker = [];
        const rpcPorts = serversConfigMap.get('master').rpcPorts;
        rpcPorts.forEach((port) => {
            const worker = new BaseWorker_1.BaseWorker(path.join(__dirname, '../server/ServerLauncher'), {
                nodeId: `RPC${port}`,
                port: port,
                autuResume: true,
                serverType: 'RPC',
                env,
            });
            this._serverWorker.push(worker);
            worker.fork();
        });
    }
    /** 启动rpc客户端 */
    static initRpcClient() {
        if (this.isServer() === false) {
            return;
        }
        if (serverConfig.serverType === 'RPC') {
            return;
        }
        this._clients = [];
        const config = serversConfigMap.get('master');
        const rpcPorts = config.rpcPorts;
        if (rpcPorts) {
            rpcPorts.forEach((port) => {
                this._clients.push(new RpcClient_1.RpcClient(config.ip, port, config.rpcBulkTime !== 0));
            });
        }
        else {
            process.nextTick(() => {
                eventEmitter.emit(StoneDefine_1.StoneEvent.RpcServerConnected);
            });
        }
    }
    static getServersCodePath() {
        const cwd = process.cwd();
        const codeDir = cwd.substring(path.join(cwd, '../').length);
        let serversPath = path.join(cwd, `${codeDir}/app/servers`);
        if (this.fileExist(serversPath))
            return serversPath;
        serversPath = path.join(cwd, `dist/${codeDir}/app/servers`);
        if (this.fileExist(serversPath))
            return serversPath;
        serversPath = path.join(cwd, 'dist/app/servers');
        if (this.fileExist(serversPath))
            return serversPath;
        serversPath = path.join(cwd, 'app/servers');
        if (this.fileExist(serversPath))
            return serversPath;
    }
    /** 获取服务remote信息 */
    static getRemoteInfo() {
        if (this._serverRemoteMap) {
            return this._serverRemoteMap;
        }
        // 遍历所有服务的remote目录
        const serverRemoteMap = new Map();
        const serversPath = this.getServersCodePath();
        const dirs = fs.readdirSync(serversPath);
        for (let index = 0; index < dirs.length; index++) {
            const dirName = dirs[index];
            const remotePath = path.join(serversPath, `/${dirName}/src/remote`);
            if (this.fileExist(remotePath) === false) {
                continue;
            }
            const remoteFiles = fs.readdirSync(remotePath);
            const remoteMap = new Map();
            remoteFiles.forEach((fileName) => {
                if (!fileName.endsWith('.js')) {
                    return;
                }
                const className = fileName.substring(0, fileName.indexOf('.js'));
                const remoteClass = require(`${remotePath}/${fileName}`);
                remoteClass[className] && remoteMap.set(className, remoteClass[className]);
            });
            serverRemoteMap.set(dirName, remoteMap);
        }
        this._serverRemoteMap = serverRemoteMap;
        return serverRemoteMap;
    }
    /** RPC 远程call调用,等待调用返回值 */
    static call(serverName, className, funcName, routeOption, ...args) {
        var _a;
        return (_a = this.getClient()) === null || _a === void 0 ? void 0 : _a.call(serverName, className, funcName, routeOption, args);
    }
    /** RPC 远程send调用,不关注返回值 */
    static send(serverName, className, funcName, routeOption, ...args) {
        var _a;
        (_a = this.getClient()) === null || _a === void 0 ? void 0 : _a.send(serverName, className, funcName, routeOption, args);
    }
    /** 生成调用序列 */
    static initRpcModule() {
        if (this.isServer() === false) {
            return;
        }
        const serverRemoteMap = this.getRemoteInfo();
        global.rpc = {};
        const rpcAny = rpc;
        rpcAny.call = this.call;
        rpcAny.send = this.send;
        serverRemoteMap.forEach((remoteClassMap, serverName) => {
            rpcAny[serverName] = {};
            remoteClassMap.forEach((remoteClass, className) => {
                const name = CommonUtils_1.CommonUtils.firstCharToLowerCase(className);
                rpcAny[serverName][name] = {};
                const classAny = rpcAny[serverName][name];
                const functionList = Object.getOwnPropertyNames(remoteClass.prototype);
                functionList.forEach((funcName) => {
                    if (funcName === 'constructor') {
                        return;
                    }
                    classAny[`call${CommonUtils_1.CommonUtils.firstCharToUpperCase(funcName)}`] = this.call.bind(this, serverName, className, funcName);
                    classAny[`send${CommonUtils_1.CommonUtils.firstCharToUpperCase(funcName)}`] = this.send.bind(this, serverName, className, funcName);
                });
            });
        });
    }
    /** 测试环境 生成并更新rpc类型描述文件 */
    static initRpcDeclare() {
        if (serversConfigMap.get('master').isCreateRpcDeclare !== true) {
            return;
        }
        let rpcDeclare = `
declare interface RpcRouterOptions {
    type?: number | 0/* random */ | 1/* target */ | 2/* all */;
    nodeId?: string;
}
        
declare class rpc {
`;
        try {
            const serverRemoteMap = this.getRemoteInfo();
            let serverDeclare = '';
            let remoteDeclare = '';
            serverRemoteMap.forEach((remoteClassMap, serverName) => {
                const serverType = CommonUtils_1.CommonUtils.firstCharToUpperCase(serverName);
                rpcDeclare += `    static ${serverName}: typeof ${serverType};\n`;
                serverDeclare += `\ndeclare class ${serverType} {\n`;
                remoteClassMap.forEach((remoteClass, className) => {
                    const functionList = Object.getOwnPropertyNames(remoteClass.prototype);
                    const funcDescList = this.getClassFunctionDesc(serverName, className, functionList);
                    if (!funcDescList) {
                        return;
                    }
                    const classTypeName = `${serverType}_${className}`;
                    serverDeclare += `    static ${CommonUtils_1.CommonUtils.firstCharToLowerCase(className)}: typeof ${classTypeName};\n`;
                    remoteDeclare += `\ndeclare class ${classTypeName} {\n`;
                    // 将具体方法写入
                    funcDescList.forEach((funcDesc) => {
                        remoteDeclare += `    static ${funcDesc}\n`;
                    });
                    remoteDeclare += '}\n';
                });
                serverDeclare += '}\n';
            });
            rpcDeclare += '}\n';
            rpcDeclare += serverDeclare;
            rpcDeclare += remoteDeclare;
            fs.writeFileSync(path.join(process.cwd(), '/app/RpcIndex.d.ts'), rpcDeclare);
            fs.writeFileSync(path.join(process.cwd(), '/app/StoneIndex.d.ts'), fs.readFileSync(path.join(__dirname, '../../../../common/index.d.ts')));
        }
        catch (error) {
            logger.error(`生成RPC描述文件失败`, error);
        }
    }
    /** 获取remote class所有函数的描述信息 */
    static getClassFunctionDesc(serverType, className, functionList) {
        const funcDescList = [];
        const filePath = path.join(process.cwd(), `/app/servers/${serverType}/src/remote/${className}.ts`);
        if (this.fileExist(filePath) === false) {
            return;
        }
        const fileText = fs.readFileSync(filePath, { encoding: 'utf8' });
        functionList.forEach((funcName) => {
            if (funcName === 'constructor') {
                return;
            }
            const res = this.getFunctionDesc(funcName, fileText);
            if (res) {
                funcDescList.push(...res);
            }
        });
        return funcDescList;
    }
    /** 获取remote class指定函数的描述信息 */
    static getFunctionDesc(funcName, fileText) {
        const index = fileText.indexOf(` ${funcName}`);
        if (index === -1) {
            return;
        }
        fileText = fileText.substring(index + 1);
        fileText = fileText.substring(0, fileText.indexOf(' {'));
        const resultTypeIndex = fileText.indexOf('):');
        const resultType = resultTypeIndex !== -1 ? fileText.substring(resultTypeIndex + 2).trim() : '';
        const isPromiseResult = resultType.indexOf('Promise<') !== -1;
        let modelFunc = CommonUtils_1.CommonUtils.firstCharToUpperCase(fileText.substring(0, resultTypeIndex + 1));
        const argsStr = `${modelFunc.substring(modelFunc.indexOf('(') + 1, modelFunc.indexOf(')'))}`;
        modelFunc = `${modelFunc.substring(0, modelFunc.indexOf('('))}(routeOption: RpcRouterOptions, ${argsStr})`;
        const call = `call${modelFunc}${resultTypeIndex !== -1 ? `: ${isPromiseResult ? resultType : `Promise<${resultType}>`};` : ''}`;
        const send = `send${modelFunc}: void;`;
        return [call, send];
    }
    // 判断文件夹是否存在的办法
    static fileExist(path) {
        try {
            fs.accessSync(path);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static getRpcWorker() {
        return this._serverWorker;
    }
}
exports.RpcManager = RpcManager;
RpcManager._index = 0;
//# sourceMappingURL=RpcManager.js.map