---
sidebar_position: 9
---

# MCP 服务器

```bash
lore mcp
```

在 stdio 上启动 MCP 服务器以供代理访问。兼容 Claude Code、Cursor 和其他 MCP 客户端。

## 何时使用 MCP

当你希望代理或工具以编程方式查询 Lore 而不是直接调用 CLI 命令时使用 MCP。

- 检索工具：搜索、提问、图遍历
- 健康工具：代码检查摘要、孤立/间隙/歧义检查
- 写入工具：摄入和编译
- 维护工具：重复检查和索引重建

## 工具

| 工具 | 描述 |
|---|---|
| `search(query)` | BM25 排名摘要 |
| `ask(question)` | BFS/DFS + LLM 答案 |
| `explain(concept)` | 从锚定文章 + 邻居进行深度概念解释 |
| `list_articles()` | 来自文章索引的 slug + 标题 |
| `get_article(slug)` | 完整文章 Markdown |
| `get_neighbors(slug)` | 通过反向链接的相关文章 |
| `path(from, to)` | 最短概念路径 |
| `graph_stats()` | 文章计数、反向链接密度 |
| `lint_summary()` | 孤立、间隙、歧义、建议、诊断 |
| `ingest(input, tags?)` | 将本地路径或 URL 摄入到 `.lore/raw` |
| `compile(force?, conceptsOnly?)` | 将原始源编译为 Wiki 文章 |
| `check_duplicate(content?, sha256?)` | 针对 `.lore/raw/<sha>` 的重复预检查 |
| `list_raw_tags()` | 原始元数据分类摘要（格式 + 热门标签） |
| `rebuild_index(repair?)` | 重建搜索索引/反向链接（可选清单修复） |
| `list_orphans()` | 列出没有传入链接的文章 |
| `list_gaps()` | 列出被链接引用的缺失概念目标 |
| `list_ambiguous()` | 列出标记为 `confidence: ambiguous` 的文章 |

## 工具组

- 检索：`search`、`ask`、`explain`、`list_articles`、`get_article`、`get_neighbors`、`path`
- 图诊断：`graph_stats`、`lint_summary`、`list_orphans`、`list_gaps`、`list_ambiguous`
- 写入：`ingest`、`compile`
- 摄入/索引维护：`check_duplicate`、`list_raw_tags`、`rebuild_index`

## 集成示例模式

从项目根目录运行 Lore MCP 服务器：

```bash
lore mcp
```

客户端模式：

1. 连接到 stdio 传输
2. 调用 `list_tools`
3. 使用 JSON 参数执行工具请求
4. 从响应解析文本负载

## 新实用工具

- `check_duplicate` 接受原始 `content`（在服务器端哈希）或已知的 `sha256`，并返回是否存在现有原始条目。
- `ingest` 接受 `input`（路径或 URL）和可选的 `tags`，然后通过 MCP 运行 Lore 的摄入管道。
- `compile` 接受可选的 `force` 和 `conceptsOnly` 标志，通过 MCP 运行 Lore 的编译管道。
- `list_raw_tags` 聚合 `.lore/raw/` 中的 `meta.json`，返回：
	- 总条目计数
	- 每种格式的计数
	- 按频率排列的热门推断标签
- `rebuild_index` 通过 MCP 运行 Lore 的索引重建；传递 `repair: true` 以先恢复缺失的清单条目。
- `list_orphans` 从代码检查诊断中返回专注的孤立视图，用于图维护工作流。
- `list_gaps` 返回未解析的概念目标，以便代理可以优先创建文章。
- `list_ambiguous` 返回不确定的文章，用于审查和澄清工作流。
- `lint_summary` 包含 `diagnostics` 数组，包含机器可读的发现（`rule`、`severity`、`file`、可选 `line`、`message`）。

## 示例 MCP 调用

示例重复预检查：

```json
{
	"name": "check_duplicate",
	"arguments": {
		"content": "Architecture migration notes..."
	}
}
```

示例提问调用：

```json
{
	"name": "ask",
	"arguments": {
		"question": "How does compile lock recovery work?"
	}
}
```

示例解释调用：

```json
{
	"name": "explain",
	"arguments": {
		"concept": "compile lock recovery"
	}
}
```

示例摄入调用：

```json
{
	"name": "ingest",
	"arguments": {
		"input": "./README.md",
		"tags": ["docs", "architecture"]
	}
}
```

示例编译调用：

```json
{
	"name": "compile",
	"arguments": {
		"force": false,
		"conceptsOnly": false
	}
}
```

示例图统计调用：

```json
{
	"name": "graph_stats",
	"arguments": {}
}
```

示例响应：

```json
{
	"duplicate": true,
	"sha256": "...",
	"rawPath": ".../.lore/raw/...",
	"title": "Architecture Notes",
	"format": "md"
}
```

示例分类摘要调用：

```json
{
	"name": "list_raw_tags",
	"arguments": {}
}
```

示例带修复的索引重建：

```json
{
	"name": "rebuild_index",
	"arguments": {
		"repair": true
	}
}
```

## 推荐的代理维护循环

1. `list_orphans` 查找断开的概念。
2. `list_gaps` 查找缺失的概念页面。
3. `list_ambiguous` 识别不确定的内容。
4. `ingest` 和 `compile` 刷新知识。
5. `rebuild_index(repair=true)` 刷新图/搜索状态。

## 端到端维护场景

```text
1) check_duplicate(content)
2) rebuild_index(repair=true)
3) lint_summary()
4) list_gaps()
5) ask("What are the highest-priority wiki gaps?")
```

## 故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| 客户端无法连接 | 服务器未从仓库根目录运行 | 在初始化的 Lore 仓库中使用 `lore mcp` 启动 |
| 工具返回缺失文章错误 | 索引/Wiki 状态过期 | 运行 `rebuild_index(repair=true)` |
| `ask` 答案质量差 | Wiki 链接稀疏或内容过期 | 重新编译、重建索引并重新运行 |
| 重复检查始终为 false | 标准化后内容不同 | 提供精确的原始内容或已知的 `sha256` |

## 相关文档

- [搜索与查询](./searching-and-querying.md)
- [编译你的 Wiki](./compiling-your-wiki.md)
- [故障排除](./troubleshooting.md)