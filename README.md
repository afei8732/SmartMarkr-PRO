# SmartMarkr 智签管家 2.0

专业浏览器书签管理扩展：把上万条书签整理成可维护、可回滚、可审计的结构。

支持 Chrome / Edge 等 Chromium 内核浏览器（Manifest V3），全部数据本地处理，零上传。

## 核心能力

| 模块 | 能力 |
|---|---|
| 重复检测 | URL 规范化精确查重（去 utm/fbclid、统一端口与查询顺序）+ 同主域名标题/路径相似度聚类（倒排索引 + 并查集，避免 O(n²) 全量比较） |
| 失效链接 | HEAD→GET 回退探测、按状态分类（404/410 失效、401/403/429 受限、5xx 服务端错误、超时）、按主机限速、并发可控、结果缓存、可暂停继续 |
| 智能归档 | 按域名 / 按类型 / 按用户文件夹三种归档方式，支持关键词筛选与批量目标选择 |
| 文件夹清理 | 空文件夹识别与批量移动至回收站；重复文件夹检测 |
| 安全回收 | 删除先进 `❌ 书签回收站`；配合快照备份支持跨批次恢复 |
| 快照备份 | 破坏性批量操作前自动写入完整书签树快照（保留最近 5 份），可导出 JSON / HTML，可一键还原 |
| 导入导出 | 自有 JSON 备份格式 + 通用 Netscape HTML，兼容 Chrome / Edge / Firefox 书签导入；支持冲突策略（跳过 / 重复创建 / 覆盖） |
| 标签页工作流 | 导出当前标签页、把导入内容直接保存为书签或批量打开 |

## 架构

```text
manifest.json             Manifest V3 清单
background/
  service-worker.js       工具栏图标入口（chrome.action）
manager.html              管理界面
scripts/
  core-utils.js           URL 规范化、域名解析、分词、并发池、限速、LRU
  backup-manager.js       快照创建 / 列出 / 还原 / 导出
  dedupe.js               重复与相似书签检测引擎
  link-checker.js         链接健康检查引擎
  portable-io.js          JSON / Netscape HTML 导入导出引擎
  manager.js              界面控制器与 Chrome Bookmarks API 集成
tests/
  selftest.js             Node 20 回归测试（node:test）
```

## 安装

1. 打开 `chrome://extensions/`（Edge 为 `edge://extensions/`）
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本目录
4. 点击工具栏图标进入管理界面

## 开发与验证

```bash
npm test        # Node 20 回归测试
npm run check   # 语法检查全部脚本
```

## 设计原则

- **本地优先**：除主动执行的链接探测外，不产生任何外部请求；无账号、无遥测、无云端依赖
- **可回滚**：任何批量破坏性操作都先落快照，且删除先进回收站
- **有界资源**：并发、缓存、候选对数量、快照数量全部有上限，避免大书签库下卡顿或内存膨胀
- **稳健解析**：导入解析容忍畸形 HTML、实体、BOM 与未闭合标签

## 版本

- v2.0.0 Manifest V3 迁移；新增快照备份、链接检测引擎、导入导出引擎与回归测试
- v1.0.0 首个公开版本

## 链接

- 仓库：https://github.com/afei8732/SmartMarkr-PRO
- 反馈：feidan8732@gmail.com
