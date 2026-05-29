---
slug: /
sidebar_position: 1
---

# Lore

从任何内容构建和维护持久化的 LLM 知识库。

Lore 解决了"无状态 AI"问题——即代理在会话之间丢失架构细节的上下文限制重置问题。Lore 不使用 RAG（向量嵌入、检索噪声），而是构建**编译后的 Markdown Wiki**：LLM 作为全职研究图书馆员，主动组织和交叉链接知识。

## 快速开始

```bash
npm install -g @telepat/lore
cd your-project
lore init
lore ingest ./docs/
lore compile
lore search "your query"
```

继续阅读：

- [编译你的 Wiki](./guides/compiling-your-wiki.md)
- [代码检查与健康状态](./guides/linting-and-health.md)
- [CLI 参考](./reference/cli-reference.md)
- [架构](./technical/architecture.md)

## 学习路径

### 新手入门

1. [概述](./getting-started/overview.md)
2. [安装](./getting-started/installation.md)
3. [快速开始](./getting-started/quickstart.md)

### 构建和维护 Wiki

1. [摄入内容](./guides/ingesting-content.md)
2. [编译你的 Wiki](./guides/compiling-your-wiki.md)
3. [搜索与查询](./guides/searching-and-querying.md)
4. [故障排除](./guides/troubleshooting.md)

### 发布与分享

1. [导出](./guides/exporting.md)
2. [MCP 服务器](./guides/mcp-server.md)
3. [解释命令](./guides/explain-command.md)

### 团队操作

1. [Lore Angela](./guides/lore-angela.md)
2. [最佳实践](./guides/best-practices.md)
3. [代码检查与健康状态](./guides/linting-and-health.md)

## 文档主题行为

文档站点默认遵循操作系统/浏览器的配色方案（`prefers-color-scheme`）。

## 更新内容

- 编译现在使用基于哈希的增量行为，通过 `manifest.json` 跳过未更改的提取内容。
- 编译现在使用仓库锁（`.lore/compile.lock`）防止重叠运行。
- 监视模式现在自动编译原始更改，支持防抖和排队后续处理。
- 代码检查现在在 JSON 模式下输出行感知诊断信息，以及孤立/间隙/歧义摘要。
- 编译现在生成 `.lore/wiki/concepts.json`，包含规范概念元数据和别名。
- 摄入现在自动标准化支持的聊天导出（`.json`/`.jsonl`）为转录 Markdown。
- 摄入元数据现在包含更丰富的标签（文件夹派生和启发式内存类别）。
- 重复摄入会短路重复源，实现更快、更干净的管道。
- 索引重建支持修复模式（`lore index --repair`）用于清单恢复。
- 查询支持可选的拼写错误标准化，同时保留技术标记。
- MCP 工具集现在包括摄入/编译写入工具、重复检查、分类摘要和代码检查维护工具。

## 快速维护循环

```bash
# 1) 摄入或刷新源
lore ingest ./docs

# 2) 编译并重建索引（修复缺失的清单条目）
lore compile
lore index --repair

# 3) 验证图健康状态
lore lint

# 4) 提问问题
lore query "What changed in architecture?"
```

## 工作原理

| | RAG | Lore |
|---|---|---|
| 格式 | 向量嵌入 | 结构化 Markdown |
| 检索 | 相似性搜索 | 反向链接 + FTS5/BM25 |
| 持久化 | 无状态 | 演进式 Wiki + git |
| 维护 | 手动 | LLM 驱动的图书馆员 |