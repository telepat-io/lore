---
sidebar_position: 5
---

# 搜索与查询

结合使用这些命令：`search` 用于发现，`query` 用于答案合成，`path` 用于图连接性，`explain` 用于深度概念演练。

## 搜索

```bash
lore search "term" [--limit N] [--json]
```

FTS5/BM25 全文搜索，支持排名摘要。

提示：

- 偏好使用专注的名词短语（`"plugin lifecycle"`、`"ingest metadata"`）。
- 探索广泛主题时使用 `--limit` 增加召回率。
- 搜索是词汇 BM25，因此词汇很重要。

示例：

```bash
# 广泛发现
lore search "compile lock" --limit 15

# 精确短语
lore search "manifest repair" --limit 5
```

## 查询

```bash
lore query "question" [--no-file-back] [--normalize-question] [--json]
```

BFS/DFS 遍历反向链接图 + LLM 问答。答案可以归档到 `derived/qa/`。

`--normalize-question` 在检索前启用保守的拼写错误清理，同时保留技术标记（例如路径、ID、环境变量、版本术语）。

示例：

```bash
# 保留精确查询文本
lore query "How is index rebuild implemented?"

# 应用拼写清理但保留技术标记
lore query "teh qurey about src/core/mcp.ts" --normalize-question

# 禁用文件回退副作用
lore query "What are current gaps?" --no-file-back
```

默认标准化也可以通过以下方式启用：

```bash
export LORE_QUERY_NORMALIZE=true
```

当文件回退启用时（默认），Lore 在 `.lore/wiki/derived/qa/` 下写入 Markdown 产物。

## 路径

```bash
lore path "Article A" "Article B" [--json]
```

通过反向链接图找到两篇文章之间的最短概念路径。

示例：

```bash
lore path "Compile Lock" "MCP Server"
```

如果未找到路径，命令在 JSON 模式下返回空路径和 `hops: -1`。

## 解释

```bash
lore explain "concept" [--json]
```

从相关文章的完整上下文深入研究概念。

当你需要跨相邻概念的综合信息而非简短直接答案时，使用 explain。

```bash
lore explain "Incremental Compile" --json
```

## 检索说明

- 查询流程使用索引优先上下文，然后 FTS 候选文章，最后图邻居扩展。
- 答案包含源 slug，可以持久化到 `wiki/derived/qa/`，除非禁用。
- `path` 仅限图，用于独立于 LLM 生成检查概念连接性。

### 查询检索流程

```mermaid
flowchart LR
	A[问题] --> B[索引上下文]
	B --> C[FTS 候选 slug]
	C --> D[邻居扩展]
	D --> E[LLM 答案]
	E --> F[可选文件回退 Markdown]
```

操作细节：

- FTS 阶段选择最佳匹配
- 邻居扩展添加一跳相关文章
- 在 LLM 综合前限制上下文以保持响应稳定

## 故障排除

- 查询返回低信号答案：
	- 运行 `lore index --repair` 然后重试
	- 验证源文章存在于 `.lore/wiki/articles/` 中
- 未找到路径：
	- 运行 `lore lint` 并检查 `gaps` 和 `orphans`
	- 确认预期链接作为 `[[Wiki Links]]` 存在于文章 Markdown 中

## 相关文档

- [解释命令](./explain-command.md)
- [编译你的 Wiki](./compiling-your-wiki.md)
- [故障排除](./troubleshooting.md)