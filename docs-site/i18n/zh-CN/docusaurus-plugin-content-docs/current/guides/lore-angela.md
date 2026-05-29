---
sidebar_position: 8
---

# Lore Angela

Angela 从最近的 git 提交中捕获架构决策，并将其写入 Wiki 文章。

它旨在保留合并后通常丢失的决策上下文。

## Angela 工作原理

1. 读取 `git diff HEAD~1 HEAD`
2. 读取最新提交消息
3. 将两者与决策编写提示一起发送到 Lore 的 LLM 管道
4. 将生成的文章写入 `.lore/wiki/articles/decisions/<slug>.md`

Angela 需要历史记录中至少两个提交和非空差异。

## 安装钩子

```bash
lore angela install
```
这会写入 `.git/hooks/post-commit`，调用 `lore angela run`。

钩子尽力运行，如果捕获失败不会阻止你的提交。

## 手动运行

```bash
lore angela run
```

当你需要按需捕获决策时运行此命令，例如在压缩合并或批量重构后。

## 示例工作流

```bash
# 正常提交
git commit -m "refactor: split query normalization from retrieval"

# 立即捕获决策
lore angela run

# 检查生成的决策条目
ls .lore/wiki/articles/decisions
```

典型输出位置：

```text
.lore/wiki/articles/decisions/refactor-split-query-normalization-from-retrieval.md
```

## 示例决策条目结构

Angela 提示模型输出带有 YAML frontmatter 和 Wiki 链接的 Markdown。

```md
---
title: "Split Query Normalization From Retrieval"
tags: [decisions]
sources: [commit]
updated: 2026-04-10T12:30:00Z
confidence: extracted
---

# Split Query Normalization From Retrieval

Moved typo cleanup into a dedicated step before FTS so retrieval behavior is easier to reason about.

## Related

- [[Query Pipeline]]
- [[FTS5]]
```

## 提交消息提示

当提交消息清晰地陈述意图时，Angela 质量会提高。

- 偏好：`refactor: separate lock acquisition from compile batching`
- 避免：`misc fixes`
- 尽可能包含原因，而不仅仅是内容

## 集成用例

- 活跃仓库中的提交后架构日志
- 每周审查 `decisions/` 用于入职和回顾
- 通过 `lore query` 和 `lore explain` 对决策历史进行代理辅助综合

## 故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| `Failed to read git history` | 仓库提交少于两个或 git 不可用 | 创建另一个提交并重新运行 |
| `No diff found between HEAD~1 and HEAD` | 最近两个提交没有有效内容差异 | 在有内容的提交后手动运行 |
| 钩子已安装但未出现新决策文件 | 钩子执行抑制了错误 | 手动运行 `lore angela run` 检查行为 |
| 决策文章质量差 | 提交消息太模糊或差异嘈杂 | 使用专注的提交消息和更小的逻辑提交 |

## 相关文档

- [编译你的 Wiki](./compiling-your-wiki.md)
- [解释命令](./explain-command.md)
- [搜索与查询](./searching-and-querying.md)