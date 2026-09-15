# 同类项目能力对比与取舍

SmartMarkr 2.0 在设计前调研了 GitHub 上同类书签/链接管理项目的公开实现，取各家可用之处，同时坚持「浏览器内本地运行、零账号、零后端」的定位。

## 调研对象

| 项目 | Star | 类型 | 主要优势 |
|---|---:|---|---|
| [karakeep-app/karakeep](https://github.com/karakeep-app/karakeep) | 29k | 自托管 | 自动打标签、全文检索、内容留存 |
| [linkwarden/linkwarden](https://github.com/linkwarden/linkwarden) | 19.7k | 自托管 | 页面归档、协作、可读性 |
| [go-shiori/shiori](https://github.com/go-shiori/shiori) | 11.6k | 自托管 | 轻量、可读性提取 |
| [sissbruecker/linkding](https://github.com/sissbruecker/linkding) | 11.2k | 自托管 | 极简、快速、Docker 部署 |
| [floccusaddon/floccus](https://github.com/floccusaddon/floccus) | 8.4k | 浏览器扩展 | 跨浏览器私有同步 |
| [jarun/buku](https://github.com/jarun/buku) | 7.2k | CLI | 标签、去重、批量检索 |
| [mbnuqw/sidebery](https://github.com/mbnuqw/sidebery) | 4.7k | 扩展 | 侧边栏标签/书签管理体验 |
| [Dissimilis/BookmarksManager](https://github.com/Dissimilis/BookmarksManager) | 50 | 格式库 | Netscape 书签格式读写 |
| [ricocc/rico-bookmark-manager](https://github.com/ricocc/rico-bookmark-manager) | 137 | 脚本 | 分类、去重、死链检测、回导浏览器 |

## 能力映射

| 能力 | 主流做法 | SmartMarkr 2.0 |
|---|---|---|
| URL 去重 | 原始字符串比对，易被 utm/fbclid、默认端口、大小写绕过 | `normalizeUrl`：小写 host、去跟踪参数、排序查询、去默认端口、去 hash、折叠尾斜杠 |
| 相似书签 | 全量两两比较，O(n²) 卡死 | 主域名分桶 + 标题倒排索引生成候选对 + 并查集聚类；5000 条基准约 18ms |
| 死链检测 | 单次 HEAD，403/405 误判为失效 | HEAD→GET(Range) 回退；401/403/429 归为「受限」而非「失效」；5xx 带抖动重试；可中断 |
| 探测压力 | 无限制并发，易被目标封禁 | 并发上限 16（默认 6）+ 每主机令牌桶限速（默认 300ms）+ LRU 结果缓存 |
| 批量破坏 | 直接删除，不可恢复 | 删除先进回收站 + 每次批量操作前写入完整书签树快照（保留 5 份） |
| 快照还原 | 少见 | 可列出/还原/导出 JSON/Netscape HTML；内置根节点复用，不会重建浏览器根 |
| 导入 | 仅支持自家 JSON | 自有 JSON + Netscape HTML（Chrome/Edge/Firefox 通用），容忍畸形 HTML、实体、BOM、未闭合标签 |
| 导入冲突 | 直接叠加产生重复 | 可选 `skip` / `duplicate` / `overwrite`，默认按规范化 URL 跳过 |
| 数据位置 | 多数需要账号或服务器 | 全部本地：无账号、无遥测、无云依赖 |

## 未采纳的方向与原因

| 方向 | 原因 |
|---|---|
| 自托管服务端 / 账号体系 | 用户定位是浏览器内本地工具，引入后端会带来部署与隐私成本 |
| 云端全文检索、页面归档 | 需要服务端存储与抓取，超出本地扩展边界；且与「零上传」冲突 |
| AI 自动打标签 | 需要外部模型调用，涉及数据外发；保留为后续可选的本地模型接口 |
| 跨浏览器同步 | floccus 已成熟且专注，本扩展改为提供完整导入导出，便于与之配合 |

## 参考实现的共性经验

1. **规范化是去重的前提**：几乎所有去重不准的问题都来自 URL 未规范化。
2. **必须区分「失效」与「受限」**：把 401/403 当死链会误导用户删除有效书签。
3. **破坏性操作要有回退路径**：回收站 + 快照是成本最低、收益最高的安全设计。
4. **导入解析要容忍现实数据**：真实导出的 HTML 经常存在未闭合标签与实体转义。
5. **大书签库要有界**：候选对、并发、缓存、快照数量都必须有硬上限。
