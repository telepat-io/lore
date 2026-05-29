---
slug: /features
title: "编译后的 Wiki，而非向量嵌入"
description: Lore 能为需要 LLM 保留真实架构上下文的团队带来什么。
keywords: [lore, features, knowledge base, llm memory, markdown wiki, rag alternative]
sidebar_label: 功能特性
sidebar_position: 1
---

# 编译后的 Wiki，而非向量嵌入

Lore 从你的项目内容构建持久化的 LLM 知识库——由 LLM 图书员组织的编译后 Markdown Wiki。没有向量嵌入。没有检索噪声。只有结构化、人类可读、git 友好的知识，在整个会话期间保持有用。

专为需要 LLM 保留真实架构上下文而无需无状态重置的团队打造。

---

## 编译后的 Markdown Wiki，而非向量嵌入

大多数知识库工具将你的内容存储为不透明的向量嵌入——不可读、不可编辑，且锁定到特定的检索模型。

Lore 将你的内容编译成结构化的 Markdown Wiki。阅读它们。编辑它们。提交到 git。你的知识属于你，采用比任何模型都持久的格式。

| | RAG | Lore |
|---|---|---|
| 格式 | 向量嵌入 | 结构化 Markdown |
| 检索 | 相似性搜索 | 反向链接 + FTS5/BM25 |
| 持久化 | 无状态 | 演进式 Wiki + git |
| 维护 | 手动 | LLM 驱动的图书馆员 |

---

## LLM 驱动的图书馆员

Lore 不仅仅是索引你的内容——LLM 主动组织和交叉链接它。6 步编译管道提取概念，匹配现有文章，生成行级编辑操作，并应用完整的来源跟踪。每个句子都知道它的来源。

新概念被命名、分类和交叉引用。孤立页面被标记。歧义被揭示。多文章编辑和拆分自动处理。就像拥有一名全职研究图书馆员维护你项目的机构知识。

```bash
lore init           # 在你的项目中创建 lore 仓库
lore ingest ./docs  # 添加源材料
lore compile        # LLM 组织和交叉链接知识
```

---

## 反向链接 + FTS5/BM25 搜索

无需向量相似性搜索的噪声即可精确找到你需要的内容。反向链接显示概念之间的连接方式。FTS5/BM25 提供快速、精确的文本检索。查询和搜索通过图和全文索引同时解析。

```bash
lore search "architecture"
lore query "How does authentication work?"
lore path <concept>      # 显示到概念的所有路径
```

---

## 代码驱动的管道

Lore 的摄入、编译、索引和图构建都是确定性代码。你的代币用于知识组织——理解和链接概念——而不是基础设施开销。没有上下文窗口浪费在文件 I/O 上。没有代币浪费在序列化上。

增量编译通过 `manifest.json` 跳过未更改的内容。仓库锁防止重叠运行。每个阶段都针对代币效率进行了优化。

---

## 段落级来源跟踪

每篇文章精确跟踪哪些源贡献了哪些行。内联 `<!-- sources:HASH(CONFIDENCE) -->` 注释标记每个段落的来源，而累积的 `## References` 部分记录所有曾经合并的来源。来源是有机的——文章在首次合并时获得它——并且提供 `--concepts-only` 标志用于回填现有 Wiki。

```markdown
The auth service uses JWT tokens. <!-- sources:abc123(extracted) def456(inferred) -->
```

当 LLM 读取文章进行更新时，来源注释会被剥离，以便它看到干净的编号文本。系统自动管理来源——你只需编辑知识。

---

## 混合源摄入

Lore 标准化来自你项目知识所在位置的内容：

- Markdown、代码文件和项目文档
- URL 和网页
- 聊天记录（来自支持的代理框架的 `.json`/`.jsonl`）
- 视频记录（通过 `yt-dlp`）

```bash
lore ingest ./README.md
lore ingest https://example.com/architecture
lore ingest-sessions claude     # 摄入 Claude Code 会话历史
```

---

## 随处导出

你的 Wiki 不会被锁定在专有格式中。导出你需要的任何格式：

```bash
lore export --format slides
lore export --format pdf
lore export --format docx
lore export --format web
lore export --format canvas
lore export --format graphml
```

演示文稿、文档、可视化图表——你的知识去往你需要的地方。

---

## 代理就绪的 MCP 服务器

Lore 提供一流的 MCP 服务器，通过 stdio 暴露 16 个工具：

- **检索：** `search`、`ask`、`explain`、`list_articles`、`get_article`、`get_neighbors`、`path`
- **图诊断：** `graph_stats`、`lint_summary`、`list_orphans`、`list_gaps`、`list_ambiguous`
- **写入：** `ingest`、`compile`
- **维护：** `check_duplicate`、`list_raw_tags`、`rebuild_index`

```bash
lore mcp   # 为 Claude Code、Cursor、VS Code Copilot 或任何 MCP 主机启动 MCP 服务器
```

推荐的代理循环：`list_orphans` → `list_gaps` → `list_ambiguous` → `ingest`/`compile` → `rebuild_index(repair=true)`。

---

## Git 友好且可移植

你的整个 Wiki 是 `.lore/wiki/` 下的纯 Markdown 文件。提交它。分支它。包含在你的项目仓库中。你的知识随你的代码一起移动。

```bash
git add .lore/wiki/
git commit -m "Update project knowledge base"
```

---

## 准备构建你的知识库？

[开始使用 →](./getting-started/installation.md)

或直接跳转到[编译你的 Wiki](./guides/compiling-your-wiki.md)和 [CLI 参考](./reference/cli-reference.md)。