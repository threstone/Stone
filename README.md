#### 概况
Node.js后端多进程框架,支持动态扩容、销毁,使用Typescript实现。

#### 特性
* 使用配置决定服务端进程启动方式。
* 支持RPC函数定义自动生成,更多代码提示。
* 根据进程(nodeId)生成对应附带堆栈信息输出,Error级别输出单独输出,方便查错。
* 提供命令模块,支持动态扩容、销毁。


#### 使用

##### 1. 依赖安装
全局安装Typescript依赖(用于编译js代码):
``` 
npm install -g typescript
```

安装框架依赖:
``` 
npm install
```

##### 2. 服务创建
复制 servers\server_template 模板于servers中,并重命名为你所希望的名称,
例如创建一个gate服务器,创建后servers目录如下:
```
servers:
    -- gate
    -- server_template
```

##### 3. 配置启动服务
接下来将 config\servers.json 修改为如下信息:
```json
{
    "dev": {
        "master": {
            "ip": "127.0.0.1",
            "port": 999,
            "rpcPorts": [
                995
            ],
            "isTest": true
        },
        "gate": [
            {
                "nodeId": "Gate1",
                "ip": "127.0.0.1",
                "autuResume": true
            },
            {
                "nodeId": "Gate2",
                "ip": "127.0.0.1",
                "autuResume": true
            }
        ]
    }
}
```
其中 `dev` 表示环境,正常情况下服务可能包含多个环境如`dev` `test` `prod`,
`master`为框架管理程序,管理整个后端服务的创建,每个环境下master的配置必不可少。

接下来`gate`为servers中新建的服务,名称必须一一对应,而`gate`的值为一个
数组,其中有多少个元素,将启动多少个gate实例,自定义服务的值都必须为数组。
具体含义如下注释:
```json
{
    "dev": {
        "master": {
            "ip": "127.0.0.1",          // master ip 目前暂不支持创建服务于其他机器上，此参数暂时无用
            "port": 999,                // 命令监听端口
            "rpcPorts": [               // RPC 监听端口列表,配置多少个元素将启动对应数量的RPC Server
                995
            ],
            "isTest": true              // 表明是否测试环境,测试环境下每次启动都会重新生成RPC Typescript定义文件
        },
        "gate": [
            {
                "nodeId": "Gate1",      // 自定义进程名称
                "ip": "127.0.0.1",      // 目前暂不支持创建服务于其他机器上，此参数暂时无用
                "autuResume": true      // 是否自动重启
            },
            {
                "nodeId": "Gate2",      // 自定义进程名称
                "ip": "127.0.0.1",      // 目前暂不支持创建服务于其他机器上，此参数暂时无用
                "autuResume": true      // 是否自动重启
            }
        ]
    }
}
```

##### 4. 启动服务
由于项目完全由typescript编写,所以每当修改typescript代码,都需要在项目下执行命令以编译javascript代码
```
tsc
```

当然正常开发环境下一般都使用如下命令开启代码监听,减少每次修改都需要执行`tsc`编译的繁琐操作:
```
tsc -w
```

确保编译后在命令行中执行以下命令启动服务:
```
stone startAll dev
```

启动后将看到日志输出
```
D:\Project\Stone> stone startAll dev
[D:\Project\Stone\common\core\master\src\master.ts:11:16] [2024-04-15T16:16:33.444] [INFO] [master] [35816] init ...
[D:\Project\Stone\common\core\master\src\CommandServer.ts:15:20] [2024-04-15T16:16:33.458] [INFO] [master] start common server successfully, port:999
[D:\Project\Stone\common\core\rpc\RpcServer.ts:14:16] [2024-04-15T16:16:33.520] [INFO] [RPC995] [19788] rpc server start, port:995
[D:\Project\Stone\servers\gate\src\GlobalVar.ts:3:16] [2024-04-15T16:16:33.589] [INFO] [Gate1] init ...
[D:\Project\Stone\servers\gate\src\GlobalVar.ts:3:16] [2024-04-15T16:16:33.590] [INFO] [Gate2] init ...
[D:\Project\Stone\common\core\rpc\RpcClient.ts:74:20] [2024-04-15T16:16:35.104] [INFO] [Gate2] Gate2[17668] connect rpc server successfully
[D:\Project\Stone\common\core\rpc\RpcClient.ts:74:20] [2024-04-15T16:16:35.105] [INFO] [Gate1] Gate1[2552] connect rpc server successfully
```
通过日志可以看到创建的gate1与gate2进程成功启动了。

具体关于stone的命令可以执行如下命令查看帮助:
```
stone -h
```

##### 5. RPC使用
RPC为后端各个进程之间通讯的主要方式,本框架提供简单且附带代码提示的的远程调用方式。


###### 1.定义远程方法
在 servers\gata\src\remote 中创建一个远程调用文件 GateRemote.ts 并添加如下代码:
```typescript
export class GateRemote {
    /** 定义一个方法打印参数并返回 */
    log(str: string): string {
        logger.log(str);
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
```

添加完成后执行`stone updateRpcDesc`将生成对应的定义文件于 commom\core\rpc\index.ts 中
```typescript
declare interface RpcRouterOptions {
    type?: number | 0/* random */ | 1/* target */ | 2/* all */;
    nodeId?: string;
}
        
declare class rpc {
    static gate: typeof Gate;
}

declare class Gate {
    static gateRemote: typeof Gate_GateRemote;
}

declare class Gate_GateRemote {
    static callLog(routeOption: RpcRouterOptions, str: string): Promise<string>;
    static sendLog(routeOption: RpcRouterOptions, str: string): void;
    static callDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): Promise<string>;
    static sendDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): void;
}
```
其中以call为开头的方法将接收RPC函数的返回值,而send为开头的方法将不关注返回值。

###### 2.测试远程方法
修改 servers\gate\src\GlobalVal.ts 代码如下:
```typescript
import { RpcRouteType, StoneEvent } from "../../../common/StoneDefine";

export class GlobalVar {
    static init() {
        logger.info('init ...');
        if (serverConfig.nodeId === 'Gate1') {
            eventEmitter.once(StoneEvent.RpcServerConnected, this.test.bind(this));
        }
    }

    static async test() {
        const result = await rpc.gate.gateRemote.callLog({ type: RpcRouteType.Random }, 'hahaha');
        logger.info(`rpc.gate.gateRemote.callLog result:${result}`);

        for (let index = 0; index < 3; index++) {
            rpc.gate.gateRemote.sendLog({ type: RpcRouteType.All }, `hahaha${index}`); 
        }

        for (let index = 0; index < 3; index++) {
            rpc.gate.gateRemote.sendDelayLog({ type: RpcRouteType.Target, nodeId: 'Gate2' }, `hahaha${index}`, index * 1000);
        }
    }
}
```

`rpc.gate.gateRemote.callLog`表示为`命名空间.服务器类型.远程调用类.远程调用方法`
远程调用第一个参数恒为routeOption,用来决定远程调用的目标,支持随机目标、指定目标、和所有目标。

编译执行代码后将获得如下输出:
```
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.257] [INFO] [Gate1] hahaha
[D:\Project\Stone\servers\gate\src\GlobalVar.ts:13:16] [2024-04-15T18:01:06.259] [INFO] [Gate1] rpc.gate.gateRemote.callLog result:hahaha
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.263] [INFO] [Gate1] hahaha0
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.264] [INFO] [Gate1] hahaha1
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.265] [INFO] [Gate1] hahaha2
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.265] [INFO] [Gate2] hahaha0
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.266] [INFO] [Gate2] hahaha1
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:4:16] [2024-04-15T18:01:06.268] [INFO] [Gate2] hahaha2
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:15:16] [2024-04-15T18:01:06.278] [INFO] [Gate2] hahaha0
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:15:16] [2024-04-15T18:01:07.274] [INFO] [Gate2] hahaha1
[D:\Project\Stone\servers\gate\src\remote\GateRemote.ts:15:16] [2024-04-15T18:01:08.275] [INFO] [Gate2] hahaha2
```

##### 6. 服务发布
publish.bat

##### 7. 参考
[Anduin](https://github.com/threstone/Anduin)
