#### 概况
Node.js后端多进程框架,支持动态扩容、销毁,使用Typescript实现。

#### 特性
* 使用配置决定服务端进程启动方式。
* 支持RPC函数定义自动生成,更多代码提示。
* 根据进程(nodeId)生成对应附带堆栈信息输出,Error级别输出单独输出,方便查错。
* 提供命令模块,支持动态扩容、销毁。


#### 使用

##### 1. 项目初始化
全局安装Typescript依赖(用于编译js代码):
``` 
npm install -g typescript
```

安装框架:
``` 
npm install -g stone-framework
```

创建目录:stoneDemo
```
mkdir stoneDemo
cd stoneDemo
```

进入目录使用脚手架初始化项目:
```
stone init
```

安装项目依赖:
```
npm install
```

编译代码:
```
tsc
```

启动项目:
```
stone startAll dev
```

stoneDemo目录文件结构如下:
```
│  index.ts
│  package.json
│  publish.bat                          // 发布脚本
│  tsconfig.json
│  tsconfig_dist.json
│
├─app
│  │  RpcIndex.ts                       // RPC方法定义
│  │  StoneIndex.ts                     // 框架提供的一些全局定义
│  │
│  └─servers
│      └─template                // server目录
│          ├─config                     // 用于存放此服务所需配置,可删除
│          │      config.json
│          │
│          └─src                        // 源码文件夹
│              ├─bin
│              │      main.ts           // 服务入口文件
│              │
│              ├─remote                 // RPC文件存放目录
│              │      DemoRemote.ts     // 自定义RCP类
│              │
│              └─test                   // 单元测试目录,可删除
│                      Test.test.ts 
│
└─config                                // 全局配置目录,用于存放一些公共配置
        servers.json                    // servers配置
```
##### 2. 服务创建
打开 `app\servers\` 可以看到脚手架工具已经生成了一个模板服务template。
template的目录如下:
```
├─config
│      config.json
│
└─src
    ├─bin
    │      main.ts
    │
    ├─remote
    │      DemoRemote.ts
    │
    └─test
            Test.test.ts
```
除了入口文件外,所有其他文件及文件夹都可以删除,但如果要定义远程调用函数,则必须定义在`src\remote\`内。

##### 3. 配置启动服务
打开`config\servers.json`将看到如下信息:
```json
{
    "dev": {
        "master": {
            "ip": "127.0.0.1",
            "port": 999,
            "rpcPorts": [
                995
            ],
            "rpcBulkSize": 100,
            "rpcBulkTime": 10,
            "isCreateRpcDeclare": true
        },
        "template": [
            {
                "nodeId": "template1",
                "autuResume": true,
                "logTrace": true,
                "logLevel": "ALL",
                "inspectPort": 9229
            },
            {
                "nodeId": "template2",
                "autuResume": true,
                "logTrace": true,
                "logLevel": "ALL",
                "inspectPort": 9230
            }
        ]
    }
}
```
其中 `dev` 表示环境,正常情况下服务可能包含多个环境如`dev` `test` `prod`,
`master`为框架管理程序,管理整个后端服务的创建,每个环境下master的配置必不可少。
其中`rpcPorts` `rpcBulkSize` `rpcBulkTime` `isCreateRpcDeclare`为master专用配置,在其他地方定义无效,详细意义查看`StoneIndex.ts`中的注释。

接下来`template`为servers中新建的服务,名称必须一一对应,而`template`的值为一个
数组,其中有多少个元素,就会启动多少个`template`实例,并且元素内的所有内容都将被作为启动参数
带入服务。自定义服务的值都必须为数组。
具体含义如下注释:
```json
{
    "dev": {
        "master": {
            "ip": "127.0.0.1",                      // master ip 目前暂不支持创建服务于其他机器上，此参数暂时无用
            "port": 999,                            // 命令监听端口
            "rpcPorts": [                           // RPC 监听端口列表,配置多少个元素将启动对应数量的RPC Server
                995
            ],
            "rpcBulkSize": 100,                     // RPC 批量发送大小,默认100
            "rpcBulkTime": 10,                      // rpc最大缓存时间,默认10毫秒
            "isCreateRpcDeclare": true              // 是否生成rpc描述文件,true则每次启动都会重新生成RPC Typescript定义文件,默认false
        },
        "template": [ // 服务类型
            {
                "nodeId": "template1",              // 自定义进程名称
                "autuResume": true,                 // 是否自动重启
                "logTrace": true,                   // 是否开启日志跟踪
                "logLevel": "ALL",                  // 日志输出级别
                "inspectPort": 9229                 // 调试端口
            },
            {
                "nodeId": "template2",              // 自定义进程名称
                "autuResume": true,                 // 是否自动重启
                "logTrace": true,                   // 是否开启日志跟踪
                "logLevel": "ALL",                  // 日志输出级别
                "inspectPort": 9230                 // 调试端口
            }
        ]
    }
}
```

所以此配置的含义为启动两个`template`服务实例,分别为`template1`和`template2`

##### 4. 启动服务
由于项目完全由typescript编写,所以每当修改typescript代码,都需要在项目下执行命令以编译javascript代码:
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

启动后将看到日志输出:
```
[2025-02-27T10:43:21.120] [INFO] [master] [30432] init ...
[2025-02-27T10:43:21.124] [DEBUG] [master] start common server successfully, port:999
[2025-02-27T10:43:21.290] [DEBUG] [RPC995] [22588] rpc server start, port:995
D:\Project\Stone\app\servers\template\src\bin\main.ts:1:8 [2025-02-27T10:43:21.294] [INFO] [template1] init...
[2025-02-27T10:43:21.299] [DEBUG] [RPC995] RPC995[22588] connect rpc server successfully
D:\Project\Stone\app\servers\template\src\bin\main.ts:1:8 [2025-02-27T10:43:21.300] [INFO] [template2] init...
D:\Project\Stone\common\core\rpc\RpcClient.ts:76:20 [2025-02-27T10:43:21.309] [DEBUG] [template1] template1[38812] connect rpc server successfully
D:\Project\Stone\common\core\rpc\RpcClient.ts:76:20 [2025-02-27T10:43:21.315] [DEBUG] [template2] template2[31928] connect rpc server successfully
```
通过日志可以看到创建的server_template1与server_template2进程成功启动了。

具体关于stone的命令可以执行如下命令查看帮助:
```
stone -h
```

##### 5. RPC使用
RPC为后端各个进程之间通讯的主要方式,本框架提供简单且附带代码提示的的远程调用方式。


###### 1.定义远程方法
打开`app\servers\template\src\remote\DemoRemote.ts`,可以看到如下脚手架工具已经创建好的RPC函数:
```typescript
export class DemoRemote {
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

修改代码后执行`stone updateRpcDesc`将生成对应的定义文件于`app\RpcIndex.ts`中,
后续每一次修改RPC函数,都需要执行此命令以更新定义,或者在`servers.json`的`master`配置中指定`isCreateRpcDeclare`为`true`,启动项目将自动更新RPC定义文件。
`app\RpcIndex.ts`中RPC定义如下:
```typescript

declare interface RpcRouterOptions {
    type?: number | 0/* random */ | 1/* target */ | 2/* all */;
    nodeId?: string;
}
        
declare class rpc {
    static template: typeof Template;
}

declare class Template {
    static demoRemote: typeof Template_DemoRemote;
}

declare class Template_DemoRemote {
    static callLog(routeOption: RpcRouterOptions, str: string): Promise<string>;
    static sendLog(routeOption: RpcRouterOptions, str: string): void;
    static callDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): Promise<string>;
    static sendDelayLog(routeOption: RpcRouterOptions, str: string, delayTime: number): void;
}
```
其中以call为开头的方法将接收RPC函数的返回值,而send为开头的方法将不关注返回值。

###### 2.测试远程方法
打开 `app\servers\template\src\bin\main.ts` 代码如下:
```typescript
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
```

`rpc.template.demoRemote.callLog`表示为`命名空间.服务器类型.远程调用类.远程调用方法`
远程调用第一个参数恒为routeOption,用来决定远程调用的目标,支持随机目标、指定目标、和所有目标。

编译执行代码后将获得如下输出:
```
[2025-02-27T10:54:48.065] [DEBUG] [RPC995] [40440] rpc server start, port:995
D:\Project\Stone\template\dist\app\servers\template\src\bin\main.js:4:8 [2025-02-27T10:54:48.080] [INFO] [template1] init...
D:\Project\Stone\template\dist\app\servers\template\src\bin\main.js:4:8 [2025-02-27T10:54:48.086] [INFO] [template2] init...
D:\Project\Stone\template\node_modules\stone-framework\dist\common\core\rpc\RpcClient.js:66:20 [2025-02-27T10:54:48.090] [DEBUG] [template1] template1[35024] connect rpc server successfully
D:\Project\Stone\template\node_modules\stone-framework\dist\common\core\rpc\RpcClient.js:66:20 [2025-02-27T10:54:48.093] [DEBUG] [template2] template2[37284] connect rpc server successfully
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.084] [INFO] [template1] hahaha
D:\Project\Stone\template\dist\app\servers\template\src\bin\main.js:10:12 [2025-02-27T10:54:51.099] [INFO] [template1] rpc.template.demoRemote.callLog result:hahaha
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.114] [INFO] [template1] all hahaha0
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.117] [INFO] [template1] all hahaha1
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.118] [INFO] [template2] all hahaha0
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.119] [INFO] [template1] all hahaha2
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.119] [INFO] [template2] all hahaha1
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:7:16 [2025-02-27T10:54:51.120] [INFO] [template2] all hahaha2
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:17:16 [2025-02-27T10:54:51.121] [INFO] [template2] template2 hahaha0
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:17:16 [2025-02-27T10:54:52.126] [INFO] [template2] template2 hahaha1
D:\Project\Stone\template\dist\app\servers\template\src\remote\DemoRemote.js:17:16 [2025-02-27T10:54:53.122] [INFO] [template2] template2 hahaha2
```

##### 6. 服务发布
publish.bat

##### 7. 参考
[Anduin](https://github.com/threstone/Anduin)
