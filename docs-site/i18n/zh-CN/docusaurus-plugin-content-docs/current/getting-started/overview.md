---
sidebar_position: 1
---

# 概述

Lore 是一个 CLI 工具，用于从任何内容构建持久化的 LLM 知识库。它摄入文档，将其编译成交叉链接的 Markdown Wiki，并提供全文搜索、问答和导出功能。

## Lore 优化目标

- 持久化的知识产物，而非临时的聊天上下文
- Markdown 原生输出，易于审查和版本控制
- 实用的操作循环：摄入、编译、代码检查、查询和导出
- 通过 MCP 和结构化命令输出实现代理互操作性
- 段落级来源跟踪，使每个句子都能追溯到其来源

## 核心功能

- **多格式摄入** -- Markdown、PDF、DOCX、HTML、JSON、图像、URL、视频
- **LLM 编译** -- 6 步管道，包含概念提取、文章匹配和逐行操作生成；基于哈希的增量编译，支持编译锁安全
- **来源跟踪** -- 每段内联源注释；每篇文章累积 `## References`；有机获取，支持 `--concepts-only` 回填
- **逐行操作** -- 替换、插入、删除范围、替换范围、拆分、追加源、软删除 -- 全部由 LLM 生成
- **FTS5/BM25 搜索** -- 快速全文搜索，支持排名和摘要
- **BFS/DFS 遍历** -- 通过反向链接导航知识图
- **监视自动化** -- 防抖的原始变更检测，支持排队的自动编译协调
- **健康诊断** -- 代码检查摘要 + 行感知诊断，用于检测断开的链接和薄弱页面
- **概念元数据索引** -- 生成的 `.lore/wiki/concepts.json`，包含规范名称、别名、标签和置信度
- **Obsidian 兼容** -- `[[wiki-links]]`、YAML frontmatter、`.canvas` 文件
- **MCP 服务器** -- 代理可访问的搜索和查询
- **多种导出** -- bundle、slides、PDF、DOCX、web、canvas、GraphML

## 核心工作流

```mermaid
flowchart LR
	A[摄入源] --> B[编译 Wiki 文章]
	B --> C[索引 + 图刷新]
	C --> D[搜索、查询、解释]
	D --> E[代码检查与改进]
	E --> F[导出或服务]
```

## 适用人群

| 角色 | 典型用途 |
|---|---|
| 工程团队 | 保留架构决策和实现上下文 |
| 产品/运营团队 | 从混合文档构建可搜索的操作手册 |
| AI 代理工作流 | 为 MCP 工具提供持久化的知识表面 |
| 个人研究者 | 策划和查询演进的主题地图 |

## 使用场景

### 工程决策记忆

- 摄入 RFC、PR 说明和设计文档
- 编译和查询历史决策理由
- 使用 Angela 捕获代码更改背后的原因

### 团队入职加速

- 将内部文档编译成概念链接的页面
- 对不熟悉的组件运行 `lore explain`
- 导出为 web/pdf 以进行更广泛的分发

### 代理维护循环

- 运行 MCP 工具发现间隙/孤立/歧义
- 修复索引、重新编译和重新代码检查
- 在刷新的图状态上提出针对性问题

## 快速示例

```bash
lore init
lore ingest ./docs
lore compile
lore query "How does compile lock recovery work?"
lore export web
```

## 相关文档

- [安装](./installation.md)
- [快速开始](./quickstart.md)
- [架构](../technical/architecture.md)