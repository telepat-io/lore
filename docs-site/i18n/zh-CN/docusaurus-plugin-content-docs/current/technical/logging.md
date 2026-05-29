---
sidebar_position: 3
---

# 运行日志

Lore 为以下命令发出结构化 JSONL 日志：

- `lore ingest`
- `lore compile`
- `lore query`

每次命令运行都有唯一的运行 ID 和日志文件，位于：

- `.lore/logs/<runId>.jsonl`

## 为什么日志很重要

运行日志是在自动化和无头运行中诊断管道行为的最快方式。

- 重建命令执行顺序
- 检查重试/进度行为
- 捕获运行时失败的来源
- 将令牌密集操作与模型行为关联

日志保留和轮换：

- 日志在创建每个新运行日志前自动轮换。
- 默认保留 200 个文件。
- 设置 `LORE_LOG_MAX_FILES` 以覆盖保留计数。

## JSONL 结构

每行是一个独立的 JSON 对象。这使日志适合流式处理，易于使用面向行的工具处理。

## 事件模型

每行是一个独立的 JSON 对象，包含以下字段：

- `runId`
- `command`
- `event`
- `timestamp`
- `step`
- `elapsedMs`
- `details`
- `error`

常见事件包括：

- `run_start`
- `step_start`
- `step_end`
- `progress`
- `token`
- `retry`
- `error`
- `run_end`

示例事件行：

```json
{
	"runId": "2026-04-10T12-30-12-123Z-abcd1234",
	"command": "compile",
	"event": "step_end",
	"timestamp": "2026-04-10T12:30:14.201Z",
	"step": "compile.batch",
	"elapsedMs": 598,
	"details": {
		"written": 7
	}
}
```

## 按命令的步骤覆盖

| 命令 | 典型高信号步骤 |
|---|---|
| `ingest` | 路由选择、解析器步骤、标准化、清单更新 |
| `compile` | 锁获取、批量 LLM 调用、重试、重建索引、概念写入 |
| `query` | 索引加载、FTS 搜索、邻居扩展、LLM 响应、文件回退 |

## 控制台摘要

人类可读模式打印简洁的 stderr 摘要：

- 运行开始，包含命令和运行 ID
- 运行结束，包含状态、经过时间和日志路径

在 `--json` 模式下，命令输出包含 `runId` 和 `logPath`，用于直接日志收集。

## 令牌日志

查询和编译将令牌事件流式传输到 JSONL 日志中，原始令牌文本在 `details.token` 下。

将运行日志视为敏感信息，因为令牌负载可能包含源/上下文摘录。

## 调试手册

```bash
# 列出最新运行
ls -lt .lore/logs | head

# 检查一次运行
cat .lore/logs/<run-id>.jsonl

# 隔离重试事件
grep '"event":"retry"' .lore/logs/<run-id>.jsonl
```

## 操作防护栏

- 当源内容敏感时避免共享完整日志
- 在受限环境中轮换或清除日志
- 使用 `LORE_LOG_MAX_FILES` 限制保留的运行历史

## 相关文档

- [故障排除](../guides/troubleshooting.md)
- [编译你的 Wiki](../guides/compiling-your-wiki.md)
- [搜索与查询](../guides/searching-and-querying.md)