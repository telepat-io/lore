---
sidebar_position: 7
---

# 代码检查与健康状态

```bash
lore lint [--json]
```

运行 Wiki 健康检查：

- **孤立文章** -- 没有传入链接的文章
- **间隙** -- 在多篇文章中提及但没有自己文章的概念
- **歧义** -- frontmatter 中标记为 `confidence: ambiguous` 的文章
- **建议问题** -- 从间隙/孤立/歧义生成的后续提示
- **诊断** -- 行感知诊断，用于可操作的修复

## 为什么代码检查很重要

代码检查将 Wiki 质量问题转化为优先级排序的、机器可读的维护队列。

- 尽早捕获断开的概念链接
- 揭示薄弱的覆盖和断开的页面
- 帮助推动后续编译和内容工作

## 诊断（JSON）

`lore lint --json` 包含 `diagnostics` 数组，同时保留旧版摘要数组。

诊断结构：

```json
{
	"rule": "broken-wikilink",
	"severity": "error",
	"file": ".lore/wiki/articles/example.md",
	"line": 12,
	"message": "Wiki link target missing-topic has no corresponding article."
}
```

当前规则：

- `broken-wikilink`（`error`）
- `orphaned-article`（`warning`）
- `ambiguous-confidence`（`warning`）
- `missing-summary`（`warning`）
- `short-page`（`warning`）

### 规则优先级矩阵

| 规则 | 严重性 | 典型操作 |
|---|---|---|
| `broken-wikilink` | `error` | 创建缺失的目标文章或修复链接目标 |
| `orphaned-article` | `warning` | 从相关文章添加传入链接 |
| `ambiguous-confidence` | `warning` | 在有理由时澄清声明并调整置信度 |
| `missing-summary` | `warning` | 添加 frontmatter 摘要 |
| `short-page` | `warning` | 用有意义的上下文扩展文章主体 |

## 人类模式输出

人类模式打印经典摘要计数和诊断计数：

- `Orphans: X, Gaps: Y, Ambiguous: Z`
- `Diagnostics: N (E errors, W warnings)`

## 推荐的维护循环

```bash
# 1) 收集机器可读的健康发现
lore lint --json > lint.json

# 2) 优先处理严重失败
# （断开的 wiki 链接作为严重性=error 的诊断发出）

# 3) 编辑后重新编译/重建索引
lore compile
lore index --repair

# 4) 重新检查健康状态
lore lint --json
```

## 建议的修复工作流

1. 首先修复所有 `broken-wikilink` 诊断
2. 解决高影响的孤立文章（核心架构概念）
3. 处理歧义页面并添加摘要
4. 如果内容发生重大变化，重新运行编译/索引
5. 重新运行代码检查，直到诊断趋势下降

## 示例修复模式

### 断开的 wiki 链接

- 之前：`[[compile-locking-system]]`
- 之后：`[[Compile Locking]]` 或创建缺失的文章

### 孤立文章

- 从父/相邻概念添加反向链接
- 确保文章出现在至少一个与导航相关的页面中

### 缺少摘要

```yaml
summary: "Prevents overlapping compile runs and stale output writes."
```

## 在自动化中使用代码检查

```bash
lore lint --json > lint.json

# 在 CI 脚本中将错误视为阻塞器
cat lint.json
```

对于基于 MCP 的维护循环，使用 `lint_summary`、`list_orphans`、`list_gaps` 和 `list_ambiguous`。

## 相关文档

- [编译你的 Wiki](./compiling-your-wiki.md)
- [故障排除](./troubleshooting.md)
- [CLI 参考](../reference/cli-reference.md)
- [MCP 服务器](./mcp-server.md)
- [架构](../technical/architecture.md)