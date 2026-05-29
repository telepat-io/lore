---
sidebar_position: 1
---

# CLI 参考

每个命令都支持 `--json` 用于 stdout 上的机器可读输出。人类可读输出输出到 stderr。

## 命令

| 命令 | 描述 |
|---|---|
| `lore` | 启动交互式 TUI |
| `lore init` | 初始化 `.lore/` 仓库 |
| `lore ingest <path\|url>` | 将文件或 URL 摄入到 `raw/` |
| `lore compile [--force] [--concepts-only]` | 将更改的原始源编译为 Wiki 文章（6 步管道、基于哈希增量、锁保护） |
| `lore index [--repair]` | 重建 FTS5 索引 + `index.md`（可选从 `raw/` 修复清单） |
| `lore query "<q>" [--no-file-back] [--normalize-question]` | BFS/DFS + LLM 问答 |
| `lore search "<term>" [--limit N]` | FTS5/BM25 搜索 |
| `lore path "<A>" "<B>"` | 文章之间的最短路径 |
| `lore explain "<concept>"` | 概念深度研究 |
| `lore lint` | Wiki 健康检查 + 结构化诊断 |
| `lore angela [install\|run]` | Git 提交捕获 |
| `lore export <format> [--out dir]` | 导出 Wiki |
| `lore mcp` | 启动 MCP 服务器 |
| `lore status` | 仓库健康仪表板 |
| `lore settings` | 配置 API 密钥和模型 |

## 常用标志和行为

- `--json`：stdout 上的结构化机器输出。
- 人类模式：stderr 上的操作摘要；相关时 stdout 上的主要文本输出。
- `lore ingest --json`：当内容已存在时包含重复指示器。
- `lore ingest --cf-wait-until <value>`：覆盖 Cloudflare 浏览器运行 `gotoOptions.waitUntil` 值（默认：`networkidle2`）。对需要每个网络请求都稳定的页面使用 `networkidle0`。
- `lore compile`：使用基于哈希的增量编译，通过 `manifest.json` `extractedHash` 值跳过未更改的提取内容。
- `lore compile --force`：绕过哈希跳过并重新编译所有有效原始条目。
- `lore compile --concepts-only`：为现有文章回填来源而不重新编译。重建 `concepts.json` 和搜索索引。
- `lore compile`：由 `.lore/compile.lock` 保护以防止并发运行。
- `lore index --repair`：在重建前重建缺失的清单条目。
- `lore lint --json`：包含行感知 `diagnostics[]` 条目，包含 `rule`、`severity`、`file`、可选 `line` 和 `message`。
- `lore query --normalize-question`：在保留技术标记的同时进行保守的拼写错误清理。

指南链接：

- `lore init`：[快速开始](../getting-started/quickstart.md)
- `lore ingest`：[摄入内容](../guides/ingesting-content.md)
- `lore compile`：[编译你的 Wiki](../guides/compiling-your-wiki.md)
- `lore search`：[搜索与查询](../guides/searching-and-querying.md)
- `lore query`：[搜索与查询](../guides/searching-and-querying.md)
- `lore explain`：[解释命令](../guides/explain-command.md)
- `lore lint`：[代码检查与健康状态](../guides/linting-and-health.md)
- `lore export`：[导出](../guides/exporting.md)
- `lore angela`：[Lore Angela](../guides/lore-angela.md)
- `lore mcp`：[MCP 服务器](../guides/mcp-server.md)
- `lore settings`：[配置](../guides/configuration.md)
- 故障排除工作流：[故障排除](../guides/troubleshooting.md)
- 仓库操作模式：[最佳实践](../guides/best-practices.md)

示例：

```bash
lore ingest ./docs/architecture.md --json
lore index --repair --json
lore query "teh qurey about src/core/mcp.ts" --normalize-question --json
```

## 设置命令

交互式模式：

```bash
lore settings
```

非交互式模式：

```bash
lore settings list [--scope global|repo|all] [--json]
lore settings get [key] [--scope global|repo|all] [--json]
lore settings set <key> <value> [--scope global|repo|all]
lore settings unset <key> [--scope global|repo|all]
```

常用键：

- 全局：`openrouterApiKey`、`replicateApiToken`、`cloudflareAccountId`、`cloudflareToken`
- 仓库：`model`、`temperature`、`maxTokens`（可选）、`webExporter`、`autoCompile`（true/false）

说明：

- `lore settings unset maxTokens --scope repo` 移除显式令牌限制。
- 当 `maxTokens` 未设置时，Lore 在 LLM 请求中省略 `max_tokens`。

## 运行日志

- `lore ingest`、`lore compile` 和 `lore query` 在 `.lore/logs/<runId>.jsonl` 中创建 JSONL 日志。
- 人类模式将运行开始/结束摘要（包括 `runId` 和日志路径）打印到 stderr。
- JSON 模式在命令输出中包含 `runId` 和 `logPath`。
- 日志自动轮换；使用 `LORE_LOG_MAX_FILES` 配置保留期。

## 自动化说明

- 对脚本偏好使用 `--json`。
- 偏好 `lore lint --json` 并将 `diagnostics` `severity=error` 发现视为严重失败。
- 对于确定性维护管道，按此顺序运行：
	- `lore ingest ...`
	- `lore compile`
	- `lore index --repair`
	- `lore lint --json`
- 设置 `lore settings set autoCompile true --scope repo` 以在每次摄入后自动编译。启用后，`lore ingest` 和 `lore ingest-sessions` 自动运行编译。

## 退出码

- `0` -- 成功
- `1` -- 错误