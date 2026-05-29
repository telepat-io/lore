---
sidebar_position: 11
---

# 最佳实践

这些实践可使你的 Lore Wiki 在扩展时保持有用。

## 操作节奏

| 节奏 | 操作 |
|---|---|
| 每日活跃工作 | 对新源进行 `lore ingest`，然后 `lore compile` |
| 分享答案前 | `lore index --repair`，然后 `lore lint` |
| 每周维护 | 审查孤立、间隙和歧义条目 |
| 导出/发布前 | `lore compile --force` 以获得确定性产物 |

## 推荐的维护循环

```bash
lore ingest ./docs
lore compile
lore index --repair
lore lint --json
```

## 编写以改善检索

良好的检索始于良好的文章结构。

- 每篇文章保持一个主要概念
- 使用明确的节标题（`##`）表示主要思想
- 为相关概念添加 `[[Wiki Links]]`
- 避免模糊的标题，如"Notes"或"Misc"

有用的文章形状：

```md
---
title: "Compile Locking"
tags: [runtime, reliability]
sources: [docs]
updated: 2026-04-10T00:00:00Z
confidence: extracted
---

# Compile Locking

## Why it exists

Prevents overlapping compile runs and stale writes.

## Operational behavior

Lore uses `.lore/compile.lock` and validates stale PID locks.

## Related

- [[Incremental Compile]]
- [[Watch Mode]]
```

## 链接和命名约定

- 对长期页面偏好使用稳定的概念名称
- 保持 slug 友好的标题（清晰、简洁、具体）
- 尽可能使用 `[[Exact Concept Name]]`
- 合并重复概念，而不是保留几乎相同的页面

## 团队工作流模式

### 功能分支工作流

1. 在分支中摄入新的设计文档
2. PR 前编译和代码检查
3. 在关键提交上运行 Angela 以获取决策跟踪
4. 如果需要，为审查者导出 bundle/pdf

### 长期运行的仓库工作流

1. 定期摄入文档/更新日志
2. 每日编译
3. 每周代码检查 + 间隙分类
4. 使用 `graphml` 导出每月图分析

## 查询和解释习惯

- 在 `lore search` 中使用具体的名词短语
- 使用 `lore query` 获取与源 slug 关联的直接答案
- 使用 `lore explain` 进行概念深度研究和相关上下文综合
- 当查询包含拼写错误时启用 `--normalize-question`

## 导出策略

| 受众 | 推荐格式 |
|---|---|
| 工程师和维护者 | `bundle`、`web` |
| 非技术利益相关者 | `pdf`、`docx` |
| 演示文稿 | `slides` |
| 图分析团队 | `canvas`、`graphml` |

## 相关文档

- [编译你的 Wiki](./compiling-your-wiki.md)
- [搜索与查询](./searching-and-querying.md)
- [解释命令](./explain-command.md)
- [故障排除](./troubleshooting.md)