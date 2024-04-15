#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const servers = require('../../config/servers.json');
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
    const cmdList = ['startall', 'stopall', 'list', 'kill', 'start', 'restart', 'updaterpcdesc'];
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
/** 检查是否build js */
function checkBuild() {
    const mainPath = path.join(__dirname, '../core/master/src/bin/');
    const files = fs.readdirSync(mainPath);
    if (files.indexOf('main.js') !== -1) {
        return;
    }
    const scriptPath = path.join(__dirname, '../../dist/common/core/master/src/bin/main.js');
    // 判断文件是否存在的办法
    try {
        fs.accessSync(scriptPath);
        return;
    }
    catch (e) {
    }
    try {
        console.log('building...');
        childProcess.execSync('tsc', {});
        console.log('build success');
    }
    catch (error) {
        console.error('tsc error ', error);
    }
}
/** 启动服务 */
function startall(environmentArgs) {
    environment = environmentArgs || environment;
    let scriptPath = path.join(__dirname, '../core/master/src/bin/main.js');
    // 判断文件是否存在的办法
    try {
        fs.accessSync(scriptPath);
    }
    catch (error) {
        checkBuild();
        scriptPath = path.join(__dirname, '../../dist/common/core/master/src/bin/main.js');
    }
    if (isBackgroud) {
        if (os.platform() == 'win32') {
            console.error('windows下暂时不支持后台启动');
            return;
        }
        const cmd = `nohup node ${scriptPath} env=${environment} nodeId=master &`;
        childProcess.exec(cmd, (error, stdout, stderr) => {
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
        const worker = childProcess.fork(scriptPath, [`env=${environment}`, 'nodeId=master'], { execArgv: ['-r', 'source-map-support/register'] });
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
function updaterpcdesc() {
    let scriptPath = path.join(__dirname, '../../dist/common/core/rpc/RpcManager.js');
    // 判断文件是否存在的办法
    try {
        fs.accessSync(scriptPath);
    }
    catch (error) {
        checkBuild();
    }
    const rpcMgr = require(scriptPath);
    global.serversConfigMap = new Map();
    global.startupParam = {};
    serversConfigMap.set('master', { isTest: true });
    rpcMgr.RpcManager.initRpcDeclare();
    console.log('完成');
}
/** 展示帮助 */
function showHelp() {
    const cmdStart = os.platform() == 'win32' ? '' : 'sh ';
    console.log(`
Options:

    -h --help                 展示所有帮助
    -e --environment          指定命令运行环境
    -b                        后台启动  

Commands:

    stone startAll [environment]   启动服务                    eg: ${cmdStart}stone startAll dev
    stone stopAll [environment]    停止所有进程                eg: ${cmdStart}stone stopAll dev
    stone list [environment]       展示所有进程                eg: ${cmdStart}stone list dev
    stone kill [nodeId]            杀死指定进程                eg: ${cmdStart}stone -e dev kill Hall1
    stone start [nodeId]           启动指定进程                eg: ${cmdStart}stone -e dev start Hall1
    stone restart [nodeId]         重新启动指定进程            eg: ${cmdStart}stone -e dev restart Hall1
    stone updateRpcDesc            生成并更新rpc类型描述文件   eg: ${cmdStart}stone updateRpcDesc
        `);
}
function sendCMD(cmd, dataStr) {
    return new Promise((resolve, reject) => {
        const config = servers[environment].master;
        const http = require('http');
        // 创建HTTP GET请求选项对象
        const options = {
            hostname: config.ip,
            port: config.port,
            path: `/${cmd}`,
            method: 'GET'
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
