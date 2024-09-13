#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

global.logger = console as any;
const args = process.argv.slice(2);
if (args.length === 0) {
    showHelp();
    process.exit();
}

// 帮助命令
if (args.indexOf('-h') !== -1 || args.indexOf('--help') !== -1) {
    showHelp();
    process.exit();
}

// 环境命令
const envIndex = Math.max(args.indexOf('-e'), args.indexOf('--environment'));
let environment;
if (envIndex !== -1) {
    environment = args[envIndex + 1];
    args.splice(envIndex, 2);
}

// 是否后台启动
const isBackgroud = args.indexOf('-b') !== -1;

handleCmd();

function handleCmd() {
    // 删除不支持的所有参数
    for (let index = args.length - 1; index >= 0; index--) {
        const argv = args[index];
        if (argv.startsWith('-')) {
            args.splice(index, 1);
        }
    }
    const cmdList = ['startall', 'stopall', 'list', 'kill', 'start', 'restart', 'restartall', 'updaterpcdesc', 'init']
    const argv = args.shift().toLowerCase();
    const index = cmdList.indexOf(argv);
    if (index !== -1) {
        eval(`${argv}.apply(this, args)`);
    } else {
        console.error('未知命令,请参考如下帮助:');
        showHelp();
    }
}

/** 启动服务 */
async function startall(environmentArgs) {
    console.log('starting...', environmentArgs);
    environment = environmentArgs || environment;
    const scriptPath = path.join(__dirname, '../core/server/ServerLauncher.js');
    const execArgv = ['-r', 'source-map-support/register'];
    if (isBackgroud) {
        child_process.fork(scriptPath,
            [`env=${environment}`, 'nodeId=master'],
            { execArgv, detached: isBackgroud, stdio: 'ignore' }
        );
        setTimeout(() => {
            console.log('start successfully')
            process.exit();
        }, 1000);
    }
    else {
        const worker = child_process.fork(scriptPath,
            [`env=${environment}`, 'nodeId=master'],
            { execArgv });
        worker.on('exit', (code, signal) => {
            console.log(`exit code:${code}, signal:${signal}`);
        });
        worker.on('error', (error) => {
            console.error('error:', error);
        });
        worker.on('message', (message) => {
            console.log('message:', message);
        });
    }
}

/** 停止所有进程 */
function stopall(environmentArgs) {
    environment = environmentArgs || environment;
    sendCMD('stopAll');
}

/** 展示所有进程 */
function list(environmentArgs) {
    environment = environmentArgs || environment;
    sendCMD('list');
}

/** 杀死指定进程 */
function kill(nodeId) {
    sendCMD('kill', JSON.stringify({ nodeId: nodeId }));
}

/** 启动指定进程 */
function start(nodeId) {
    sendCMD('start', JSON.stringify({ nodeId: nodeId }));
}

/** 重新启动指定进程 */
function restart(nodeId) {
    sendCMD('restart', JSON.stringify({ nodeId: nodeId }));
}

/** 重新启动所有进程 */
function restartall(environmentArgs) {
    environment = environmentArgs || environment;
    sendCMD('restartAll');
}

/** 生成并更新rpc类型描述文件 */
async function updaterpcdesc() {
    let scriptPath = path.join(__dirname, '../core/rpc/RpcManager.js');
    const rpcMgr = require(scriptPath);
    global.serversConfigMap = new Map();
    global.startupParam = {} as any;
    serversConfigMap.set('master', { isCreateRpcDeclare: true });
    rpcMgr.RpcManager.initRpcDeclare()
    console.log('完成');
}

/** 展示帮助 */
function showHelp() {
    console.log(
        `
Options:

    -h --help                 展示所有帮助
    -e --environment          指定命令运行环境
    -b                        后台启动  

Commands:
    
    stone init                     在当前目录下创建模板工程(脚手架命令)     eg: stone init
    stone startAll [environment]   启动服务                                 eg: stone startAll dev
    stone stopAll [environment]    停止所有进程                             eg: stone stopAll dev
    stone list [environment]       展示所有进程                             eg: stone list dev
    stone kill [nodeId]            杀死指定进程                             eg: stone -e dev kill Hall1
    stone start [nodeId]           启动指定进程                             eg: stone -e dev start Hall1
    stone restart [nodeId]         重新启动指定进程                         eg: stone -e dev restart Hall1
    stone restartAll [environment] 重新启动所有进程                         eg: stone -e dev restartAll Hall1
    stone updateRpcDesc            生成并更新rpc类型描述文件                eg: stone updateRpcDesc
        `
    );
}

function sendCMD(cmd: string, dataStr?: string) {
    return new Promise((resolve, reject) => {
        const servers = require(path.join(process.cwd(), '/config/servers.json'));
        const config = servers[environment].master;
        const http = require('http');
        // 创建HTTP GET请求选项对象
        const options = {
            hostname: config.ip,
            port: config.port,
            path: `/${cmd}`,
            method: 'GET',
            headers: null
        };
        if (dataStr) {
            options.headers = {
                'Content-Type': 'application/json',
                //必须在请求头中设置内容的长度
                'Content-Length': Buffer.byteLength(dataStr)
            }
        }
        // 发起HTTP GET请求
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`${data}`);
                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.error(`Error: ${err.message}`);
            reject(err);
        });

        if (dataStr) {
            req.write(dataStr);
        }
        req.end();
    })
}

function init() {
    copyDir(path.join(__dirname, '../../../template'), process.cwd())
}


async function copyDir(src, dest) {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    await fs.promises.mkdir(dest, { recursive: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
}