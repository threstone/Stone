# Stone Framework 改进计划

> **流程要求**：
> 1. 按优先级从上到下依次完成，每次只做一项
> 2. 每项完成后必须自行测试（编译检查 + 实际启动项目运行验证），确保无误
> 3. 测试通过后提交审核，等待确认"开始下一个"后才继续
> 4. 确认"开始下一个"时，先将上一个任务的更改提交到 git，再开始新任务
> 5. 已完成的任务标记 ~~删除线~~

---

## P0 — 安全与健壮性（必须立即修复）

### ~~1. HTTP 控制接口增加鉴权~~ ✅ 已由作者完成（强制本地访问限制）

### 2. HTTP 请求方法修正
- **文件**: `common/control/Commander.ts`
- **问题**: `sendCMD` 中带 body 的请求（kill/start/add）使用 GET 方法，语义不符
- **方案**: 有 body 时改用 POST，无 body 保持 GET

### 3. RPC call 异常传播
- **文件**: `common/core/rpc/RpcClient.ts`
- **问题**: `handleCall` 中 `await remote[funcName](...args)` 无 try-catch，远程方法抛异常时调用方 Promise 永远 pending（15秒后超时）
- **方案**: 增加 try-catch，异常时回传包含错误信息的结果给调用方

### 4. `getRemoteObject` 返回值安全处理
- **文件**: `common/core/rpc/RpcClient.ts`
- **问题**: catch 后未 return，返回 undefined，后续 `remote[funcName]` 抛 `Cannot read property of undefined`
- **方案**: catch 中抛出明确错误或返回安全值；`handleCall`/`handleSend` 中增加 null 检查

### 5. RPC `call` 断线时返回 rejected Promise
- **文件**: `common/core/rpc/RpcClient.ts`
- **问题**: `call()` 在 `isClose` 时直接 `return`（返回 undefined），调用方 `await` 得到 undefined 而非错误
- **方案**: 改为 `return Promise.reject(new Error(...))`

### 6. RPC 增加错误传播字段
- **文件**: `common/core/rpc/RpcUtils.ts`, `common/core/rpc/RpcClient.ts`
- **问题**: `RpcTransferResult` 无法区分成功与失败，远端异常无法传回调用端
- **方案**: `RpcTransferResult` 增加 `error` 字段；`handleResult` 中根据 error 决定 resolve/reject

---

## P1 — 稳定性与工程化

### 7. `setInterval` 泄漏清理
- **文件**: `common/core/rpc/RpcClient.ts`, `common/core/rpc/RpcSession.ts`
- **问题**: 构造时创建的 setInterval 无清理机制，对象销毁后定时器继续运行
- **方案**: 保存 interval 引用，增加 `destroy()` 方法清除定时器

### 8. 优雅关闭（Graceful Shutdown）
- **文件**: `common/core/master/src/CommandServer.ts`
- **问题**: stopAll 直接 kill 所有子进程后 500ms 强制退出，可能丢失数据
- **方案**: 等待所有子进程 exit 事件完成后再退出，设置合理超时兜底

### 9. `_requestId` 溢出保护
- **文件**: `common/core/rpc/RpcClient.ts`
- **问题**: `_requestId` 不断递增无溢出保护（`_randIndex` 已有保护但 `_requestId` 没有）
- **方案**: 超过 `Number.MAX_SAFE_INTEGER` 时重置为 1

### 10. 补充 mocha 到 devDependencies
- **文件**: `package.json`
- **问题**: test 脚本使用 mocha 但未在依赖中声明
- **方案**: 添加 `mocha` 到 devDependencies

---

## P2 — 代码质量

### 11. 修复拼写错误
- **文件**: 多个文件
- **问题及方案**:
  - 目录 `woker` → `worker`
  - `autuResume` → `autoResume`（需向下兼容，同时支持两个字段名）
  - `_isCahce` → `_isCache`（`RpcSession.ts`）
  - `replay` → `reply`（`RpcClient.ts`）
  - `ininConfigMap` → `initConfigMap`（`ServersConfigMgr.ts`）
  - `unknow` → `unknown`（`CommandServer.ts`）

### 12. 简化入口文件导出方式
- **文件**: `index.ts`
- **问题**: 不必要的重命名再导出
- **方案**: 改为 `export { RpcRouteType, StoneEvent } from './common/StoneDefine'`

---

## P3 — 性能与功能增强

### 13. RpcSession 数组复用
- **文件**: `common/core/rpc/RpcSession.ts`
- **问题**: 每次 `doSend()` 后 `this._cacheMsgs = []` 创建新数组，增加 GC 压力
- **方案**: 改为 `this._cacheMsgs.length = 0` 复用数组

### 14. RpcServer close 事件优化
- **文件**: `common/core/rpc/RpcServer.ts`
- **问题**: close 事件中线性遍历数组查找 session，O(n) 复杂度
- **方案**: 用 `Map<nodeId, RpcSession>` 替代数组实现 O(1) 删除

### 15. 日志支持日期轮转
- **文件**: `common/core/server/ServerInit.ts`
- **问题**: 日志 `pattern: "log"` 无日期切分，不利于日志管理
- **方案**: 启用 log4js 的 `dateFile` 类型或修改 pattern 为 `yyyy-MM-dd.log`

### 16. RPC Server 就绪检测
- **文件**: `common/core/rpc/RpcServer.ts`
- **问题**: 固定 3 秒延迟等待客户端连接，节点多时不够，节点少时浪费
- **方案**: 改为基于实际连接数的就绪判断（由 master 下发期望连接数）
