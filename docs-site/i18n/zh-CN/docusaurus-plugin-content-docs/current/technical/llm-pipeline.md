---
sidebar_position: 2
---

# LLM 管道

Lore 在五个主要操作中使用 LLM 调用，其中三个组合了编译管道：

1. **概念提取** -- 从原始源内容中提取命名概念，包含描述和置信度
2. **文章匹配** -- 将源的概念与现有 Wiki 文章匹配
3. **操作生成** -- 产生行级操作，描述如何编辑匹配的文章
4. **批量创建** -- 为未匹配的源生成新文章
5. **问答（`query`）** -- 首先加载 `index.md`，然后通过 FTS + 图邻居扩展加载相关文章；回答问题；可选地将结果归档
6. **解释** -- 从匹配文章 + 图邻居进行深度概念综合

前四个组合了编译管道（→ 概念提取 → 匹配 → 操作 → 创建）。所有 LLM 调用通过 OpenRouter 使用 `openai` npm SDK 进行。

`lint` 和 `index` 不是 LLM 操作；它们在本地 Markdown 和 SQLite 状态上运行。

## 端到端 LLM 流

```mermaid
flowchart LR
    A[加载仓库和配置] --> B[解析 OpenRouter 密钥]
    B --> C[构建模型请求]
    C --> D[流式或非流式完成]
    D --> D[验证和持久化输出]
```

## 编译 LLM 阶段

### 1. 概念提取

每个更改的源与提取概念的指令一起发送到 LLM。LLM 返回 JSON 数组：

```json
[
  {
    "name": "Authentication",
    "description": "User authentication via JWT tokens and OAuth2 providers.",
    "confidence": "extracted",
    "for_source": "source_1"
  }
]
```

- **批处理**：所有更改的源在单个调用中发送。
- **置信度**：LLM 按概念决定（`extracted`、`inferred`、`ambiguous`）。
- **`for_source`**：引用批处理中的源索引（从 1 开始）。
- **零概念**：没有可提取概念的源无需匹配即可进入批量创建。

### 2. 文章匹配

每个有概念的源与现有文章集匹配。LLM 接收：

- 源标题、内容和概念
- 候选文章 slug 列表（FTS 预过滤时最多 30 个，或小型 Wiki 的完整列表）
- 带行号和来源剥离的文章主体

LLM 返回匹配文章的 slug（每个源最多 3 个）或空列表（如果没有匹配）。

**预过滤**：对于包含 200+ 篇文章的 Wiki，对概念名称的 FTS 搜索将候选项缩小到 30 个。对于较小的 Wiki，所有文章都是候选项。

### 3. 操作生成

对于每个匹配的源，LLM 生成操作的 JSON 数组：

```json
[
  {
    "op": "replace",
    "line": "¶2",
    "content": "Updated line content.",
    "sources": ["sha256(extracted)"],
    "confidence": "extracted"
  },
  {
    "op": "insert-after",
    "line": "¶5",
    "content": "New derived insight.",
    "sources": ["sha256(inferred)"],
    "confidence": "inferred"
  }
]
```

LLM 看到带有以下标记的匹配文章：
- 带有 `¶`（段落符号）前缀的行号
- 来源注释被剥离
- `## References` 和 `## Related` 部分被隐藏

**每个操作的置信度**：对于编辑现有文章，LLM 按操作设置 `confidence`（默认为 `inferred`）。对于通过批量创建创建的新文章，所有行默认为 `extracted`。

### 4. 批量创建

未匹配的源（以及零概念的源）被批量组合。LLM 生成一组创建操作：

```json
[
  {
    "op": "create",
    "slug": "jwt-authentication",
    "title": "JWT Authentication",
    "description": "How the system uses JWT tokens...",
    "lines": [
      { "content": "Line 1 content.", "sources": ["sha256(extracted)"] }
    ],
    "sources": ["sha256"],
    "confidence": "extracted"
  }
]
```

新文章写入时包含来源注释和填充的 `## References`。

## 编译截断和错误处理

编译在写入文件前验证 LLM 输出。在以下情况下响应重试一次：

- 提供商报告截断（`finish_reason=length`）
- JSON 输出无法解析
- 操作在结构上无效

在可重试失败时，编译重试一次。如果重试也失败，源被跳过（记录），编译继续处理剩余源。编译不会在单个源失败时中止。

## maxTokens 语义

- `maxTokens` 在 `.lore/config.json` 中是可选的。
- 如果设置，Lore 在 OpenRouter 请求中包含 `max_tokens`。
- 如果未设置，Lore 省略 `max_tokens` 并使用提供商/模型默认值。

## 检索侧提示

### 查询

- 上下文组合：索引 + 选定的文章主体
- 源跟踪：返回的 slug 可选地归档在派生 QA Markdown 中
- 可选标准化：通过标志或环境默认值进行保守查询清理

### 解释

- 首先精确 slug 查找，然后 FTS 回退
- 邻居扩展以丰富上下文窗口
- 带有 wiki 风格引用的长篇综合

## 运行时控制

| 控制 | 效果 |
|---|---|
| `temperature` | 输出多样性和确定性权衡 |
| `maxTokens` | 如果配置，响应长度上限 |
| `LORE_QUERY_NORMALIZE` | 默认查询标准化切换 |

## 故障模式和恢复

| 症状 | 可能原因 | 恢复方法 |
|---|---|---|
| 编译频繁重试 | LLM 输出格式错误或令牌限制 | 允许重试；如果持续则调整 model/maxTokens |
| 查询结果质量差 | 检索上下文薄弱/有限 | 运行索引修复，改进链接，重试 |
| 解释遗漏概念 | 无精确/FTS 匹配 | 重新编译并使用更清晰的概念名称 |
| 源持续获得零概念 | 内容太抽象或太短，无法进行概念提取 | 审查原始内容；可能需要手动整理 |
| 操作验证失败 | LLM 产生了无效行引用 | 编译跳过源并继续；审查原始内容 |

## 运行日志

- 编译和查询运行在 `.lore/logs/<runId>.jsonl` 中发出结构化 JSONL 事件。
- 令牌流事件记录原始令牌文本。
- 命令 stderr 显示简洁的运行开始/结束摘要，包含运行 ID 和日志路径。

## 相关文档

- [LLM 模型](../reference/llm-models.md)
- [配置](../guides/configuration.md)
- [编译你的 Wiki](../guides/compiling-your-wiki.md)
- [搜索与查询](../guides/searching-and-querying.md)
- [架构](./architecture.md)