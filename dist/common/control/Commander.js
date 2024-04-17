#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const fs_1 = require("fs");
const path = require("path");
const child_process = require("child_process");
global.logger = console;
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
    const cmdList = ['startall', 'stopall', 'list', 'kill', 'start', 'restart', 'updaterpcdesc', 'init'];
    const argv = args.shift().toLowerCase();
    const index = cmdList.indexOf(argv);
    if (index !== -1) {
        eval(`${argv}.apply(this, args)`);
    }
    else {
        console.error('未知命令,请参考如下帮助:');
        showHelp();
    }
}
/** 启动服务 */
async function startall(environmentArgs) {
    environment = environmentArgs || environment;
    const scriptPath = path.join(__dirname, '../core/server/ServerLauncher.js');
    if (isBackgroud) {
        if (os.platform() == 'win32') {
            console.error('windows下暂时不支持后台启动');
            return;
        }
        const cmd = `nohup node ${scriptPath} env=${environment} nodeId=master &`;
        child_process.exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行命令时发生错误：${error}`);
                return;
            }
            console.log(`stdout:\n${stdout}`);
            console.error(`stderr:\n${stderr}`);
        });
        setTimeout(() => {
            process.exit();
        }, 1500);
    }
    else {
        const worker = child_process.fork(scriptPath, [`env=${environment}`, 'nodeId=master'], { execArgv: ['-r', 'source-map-support/register'] });
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
/** 生成并更新rpc类型描述文件 */
async function updaterpcdesc() {
    let scriptPath = path.join(__dirname, '../core/rpc/RpcManager.js');
    const rpcMgr = require(scriptPath);
    global.serversConfigMap = new Map();
    global.startupParam = {};
    serversConfigMap.set('master', { isTest: true });
    rpcMgr.RpcManager.initRpcDeclare();
    console.log('完成');
}
/** 展示帮助 */
function showHelp() {
    console.log(`
Options:

    -h --help                 展示所有帮助
    -e --environment          指定命令运行环境
    -b                        后台启动  

Commands:
    
    stone init                     在当前目录下创建模板工程(脚手架)         eg: stone init
    stone startAll [environment]   启动服务                                 eg: stone startAll dev
    stone stopAll [environment]    停止所有进程                             eg: stone stopAll dev
    stone list [environment]       展示所有进程                             eg: stone list dev
    stone kill [nodeId]            杀死指定进程                             eg: stone -e dev kill Hall1
    stone start [nodeId]           启动指定进程                             eg: stone -e dev start Hall1
    stone restart [nodeId]         重新启动指定进程                         eg: stone -e dev restart Hall1
    stone updateRpcDesc            生成并更新rpc类型描述文件                eg: stone updateRpcDesc
        `);
}
function sendCMD(cmd, dataStr) {
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
            };
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
    });
}
function init() {
    copyDir(path.join(__dirname, '../../../template'), process.cwd());
}
async function copyDir(src, dest) {
    const entries = await fs_1.promises.readdir(src, { withFileTypes: true });
    await fs_1.promises.mkdir(dest, { recursive: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        }
        else {
            await fs_1.promises.copyFile(srcPath, destPath);
        }
    }
}
//# sourceMappingURL=Commander.js.map