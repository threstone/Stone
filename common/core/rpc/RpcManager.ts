
import * as fs from 'fs';
import * as path from 'path';
import { CommonUtils } from '../../CommonUtils';
import { BaseWorker } from '../worker/BaseWorker';
import { RpcClient } from './RpcClient';
import { StoneEvent } from '../../StoneDefine';
export class RpcManager {

    private static _index: number = 0;
    private static _clients: RpcClient[];
    private static _serverWorker: BaseWorker[];
    private static _serverRemoteMap: Map<string, Map<string, string[]>>;

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

    private static getClient() {
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
    private static isServer() {
        return (startupParam.nodeId !== 'master' && serversConfigMap.has(startupParam.nodeId))
    }

    /** 启动rpc服务器 */
    private static initRpcServers() {
        this._serverWorker = [];
        const rpcPorts = serverConfig.rpcPorts;

        // 计算期望连接的客户端数：非 master、非 RPC 类型的节点（这些节点会启动 RpcClient）
        let expectedClients = 0;
        serversConfigMap.forEach((conf) => {
            if (conf.serverType !== 'master' && conf.serverType !== 'RPC') {
                expectedClients++;
            }
        });

        rpcPorts.forEach((port) => {
            const worker = new BaseWorker(path.join(__dirname, '../server/ServerLauncher'), {
                nodeId: `RPC${port}`,
                port: port,
                autoResume: true,
                serverType: 'RPC',
                env,
                logLevel: serverConfig.logLevel || 'ALL'
            });
            this._serverWorker.push(worker);

            // worker 实例生命周期不变，子进程重启后监听器依然有效
            worker.on('queryExpectedClients', () => {
                worker.sendMessage({ event: 'setExpectedClients', count: expectedClients });
            });

            worker.fork();
        });
    }

    /** 启动rpc客户端 */
    private static initRpcClient() {
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
                this._clients.push(new RpcClient(config.ip, port, config.rpcBulkTime !== 0));
            });
        } else {
            process.nextTick(() => {
                eventEmitter.emit(StoneEvent.RpcServerConnected);
            })
        }
    }

    static getServersCodePath() {
        const cwd = process.cwd();
        const codeDir = cwd.substring(path.join(cwd, '../').length);
        let serversPath = path.join(cwd, `${codeDir}/app/servers`);
        if (this.fileExist(serversPath)) return serversPath;

        serversPath = path.join(cwd, `dist/${codeDir}/app/servers`);
        if (this.fileExist(serversPath)) return serversPath;

        serversPath = path.join(cwd, 'dist/app/servers');
        if (this.fileExist(serversPath)) return serversPath;

        serversPath = path.join(cwd, 'app/servers');
        if (this.fileExist(serversPath)) return serversPath;
    }

    /** 获取服务remote信息 */
    private static getRemoteInfo() {
        if (this._serverRemoteMap) {
            return this._serverRemoteMap;
        }
        const ts = this.getTs();
        if (!ts) {
            throw new Error('RPC remote 扫描需要 typescript 依赖');
        }
        // 遍历所有服务的remote目录
        const serverRemoteMap = new Map<string, Map<string, string[]>>();

        const serversPath = this.getServersCodePath();
        const dirs = fs.readdirSync(serversPath);
        for (let index = 0; index < dirs.length; index++) {
            const dirName = dirs[index];
            const remotePath = path.join(serversPath, `/${dirName}/src/remote`);
            if (this.fileExist(remotePath) === false) {
                continue;
            }

            const remoteFiles = fs.readdirSync(remotePath);
            const remoteMap = new Map<string, string[]>();
            remoteFiles.forEach((fileName) => {
                if (!fileName.endsWith('.js')) {
                    return;
                }
                const className = fileName.substring(0, fileName.indexOf('.js'));
                const filePath = path.join(remotePath, fileName);
                const sourceFile = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
                if (sourceFile.parseDiagnostics.length) {
                    throw new Error(`解析 RPC remote 失败: ${filePath}: ${ts.flattenDiagnosticMessageText(sourceFile.parseDiagnostics[0].messageText, '\n')}`);
                }

                let remoteClass: any;
                let isExported = false;
                sourceFile.statements.forEach((statement: any) => {
                    if (ts.isClassDeclaration(statement) && statement.name?.text === className) {
                        remoteClass = statement;
                    } else if (ts.isVariableStatement(statement)) {
                        statement.declarationList.declarations.forEach((declaration: any) => {
                            if (declaration.name.text === className && ts.isClassExpression(declaration.initializer)) {
                                remoteClass = declaration.initializer;
                            }
                        });
                    } else if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
                        const expression = statement.expression;
                        if (expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
                            && ts.isPropertyAccessExpression(expression.left)
                            && ts.isIdentifier(expression.left.expression)
                            && expression.left.expression.text === 'exports'
                            && expression.left.name.text === className
                            && ts.isIdentifier(expression.right)
                            && expression.right.text === className) {
                            isExported = true;
                        }
                    }
                });
                if (!remoteClass || !isExported) {
                    return;
                }
                const methods = new Set<string>();
                remoteClass.members.forEach((member: any) => {
                    if (!(ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member))
                        || member.modifiers?.some((modifier: any) => modifier.kind === ts.SyntaxKind.StaticKeyword)) {
                        return;
                    }
                    const name = ts.isComputedPropertyName(member.name) ? member.name.expression : member.name;
                    if ((ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name))
                        && name.text !== 'constructor') {
                        methods.add(name.text);
                    }
                });
                remoteMap.set(className, Array.from(methods));
            });
            serverRemoteMap.set(dirName, remoteMap);
        }
        this._serverRemoteMap = serverRemoteMap;
        return serverRemoteMap;
    }

    /** RPC 远程call调用,等待调用返回值 */
    private static call(serverName: string, className: string, funcName: string, routeOption: RpcRouterOptions, ...args: any[]): Promise<any> {
        return this.getClient()?.call(serverName, className, funcName, routeOption, args);
    }

    /** RPC 远程send调用,不关注返回值 */
    private static send(serverName: string, className: string, funcName: string, routeOption: RpcRouterOptions, ...args: any[]): void {
        this.getClient()?.send(serverName, className, funcName, routeOption, args);
    }

    /** 生成调用序列 */
    private static initRpcModule() {
        if (this.isServer() === false || serverConfig.serverType === 'RPC') {
            return;
        }
        const serverRemoteMap = this.getRemoteInfo();
        (global as any).rpc = {};
        const rpcAny = rpc as any;
        rpcAny.call = this.call;
        rpcAny.send = this.send;
        serverRemoteMap.forEach((remoteClassMap, serverName) => {
            rpcAny[serverName] = {};
            remoteClassMap.forEach((functionList, className) => {
                const name = CommonUtils.firstCharToLowerCase(className);
                rpcAny[serverName][name] = {};
                const classAny = rpcAny[serverName][name];
                functionList.forEach((funcName) => {
                    if (funcName === 'constructor') {
                        return;
                    }
                    classAny[`call${CommonUtils.firstCharToUpperCase(funcName)}`] = this.call.bind(this, serverName, className, funcName);
                    classAny[`send${CommonUtils.firstCharToUpperCase(funcName)}`] = this.send.bind(this, serverName, className, funcName);
                })
            });
        })
    }

    /** 测试环境 生成并更新rpc类型描述文件 */
    static initRpcDeclare() {
        // 可能会在其他服务调用到这个方法
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
                const serverType = CommonUtils.firstCharToUpperCase(serverName);
                rpcDeclare += `    static ${serverName}: typeof ${serverType};\n`

                serverDeclare += `\ndeclare class ${serverType} {\n`
                remoteClassMap.forEach((functionList, className) => {
                    const funcDescList = this.getClassFunctionDesc(serverName, className, functionList);
                    if (!funcDescList) { return; }

                    const classTypeName = `${serverType}_${className}`;
                    serverDeclare += `    static ${CommonUtils.firstCharToLowerCase(className)}: typeof ${classTypeName};\n`;
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
        } catch (error) {
            logger.error(`生成RPC描述文件失败`, error)
        }
    }

    /** 懒加载 typescript 依赖,不可用时返回 undefined */
    private static getTs() {
        try {
            return require('typescript');
        } catch (error) {
            return undefined;
        }
    }

    /** 获取remote class所有函数的描述信息 */
    private static getClassFunctionDesc(serverType: string, className: string, functionList: string[]) {
        const funcDescList: string[] = [];
        const filePath = path.join(process.cwd(), `/app/servers/${serverType}/src/remote/${className}.ts`);
        if (this.fileExist(filePath) === false) {
            return;
        }
        const fileText = fs.readFileSync(filePath, { encoding: 'utf8' });
        const ts = this.getTs();
        const sourceFile = ts?.createSourceFile(filePath, fileText, ts.ScriptTarget.Latest, true);
        if (!sourceFile) {
            logger.warn('未找到 typescript 依赖,已降级为字符串解析生成 RPC 描述文件,建议在项目 devDependencies 中安装 typescript');
        }
        functionList.forEach((funcName) => {
            if (funcName === 'constructor') {
                return;
            }
            const res = sourceFile
                ? this.getFunctionDesc(ts, this.findClassMethod(ts, sourceFile, funcName), sourceFile)
                : this.getFunctionDescByText(funcName, fileText);
            if (res) {
                funcDescList.push(...res);
            }
        });
        return funcDescList;
    }

    /** 在源文件中查找指定名称的方法节点 */
    private static findClassMethod(ts: any, sourceFile: any, funcName: string) {
        let method: any;
        const visit = (node: any) => {
            if (method) {
                return;
            }
            if (ts.isClassDeclaration(node)) {
                node.members.forEach((member: any) => {
                    if (!method && ts.isMethodDeclaration(member)
                        && member.name && member.name.text === funcName) {
                        method = member;
                    }
                });
            }
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(sourceFile, visit);
        return method;
    }

    /** 基于 AST 获取remote class指定函数的描述信息 */
    private static getFunctionDesc(ts: any, method: any, sourceFile: any) {
        if (!method || !method.name) {
            return;
        }
        const funcName = method.name.text;
        const upperName = CommonUtils.firstCharToUpperCase(funcName);

        // 参数文本,保留原始修饰符、默认值与类型
        const params = method.parameters
            .map((param: any) => param.getText(sourceFile))
            .join(', ');
        const argsPart = params ? `routeOption: RpcRouterOptions, ${params}` : 'routeOption: RpcRouterOptions';

        // 返回类型文本
        const resultType = method.type ? method.type.getText(sourceFile).trim() : '';
        const isPromise = !!method.type && (
            (ts.isTypeReferenceNode(method.type)
                && ts.isIdentifier(method.type.typeName)
                && method.type.typeName.text === 'Promise')
            || resultType.indexOf('Promise<') === 0
        );

        const call = `call${upperName}(${argsPart})${resultType ? `: ${isPromise ? resultType : `Promise<${resultType}>`};` : ''}`;
        const send = `send${upperName}(${argsPart}): void;`;
        return [call, send];
    }

    /** 降级方案:基于字符串解析remote class指定函数的描述信息 */
    private static getFunctionDescByText(funcName: string, fileText: string) {
        const index = fileText.indexOf(` ${funcName}`);
        if (index === -1) {
            return;
        }
        fileText = fileText.substring(index + 1);
        fileText = fileText.substring(0, fileText.indexOf(' {'));

        const resultTypeIndex = fileText.indexOf('):');
        const resultType = resultTypeIndex !== -1 ? fileText.substring(resultTypeIndex + 2).trim() : '';
        const isPromiseResult = resultType.indexOf('Promise<') !== -1;
        let modelFunc = CommonUtils.firstCharToUpperCase(fileText.substring(0, resultTypeIndex + 1));
        const argsStr = `${modelFunc.substring(modelFunc.indexOf('(') + 1, modelFunc.indexOf(')'))}`;
        modelFunc = `${modelFunc.substring(0, modelFunc.indexOf('('))}(routeOption: RpcRouterOptions, ${argsStr})`;
        const call = `call${modelFunc}${resultTypeIndex !== -1 ? `: ${isPromiseResult ? resultType : `Promise<${resultType}>`};` : ''}`;
        const send = `send${modelFunc}: void;`;
        return [call, send];
    }

    // 判断文件夹是否存在的办法
    static fileExist(path: string) {
        try {
            fs.accessSync(path);
            return true;
        } catch (error) {
            return false
        }
    }

    static getRpcWorker() {
        return this._serverWorker;
    }
}
