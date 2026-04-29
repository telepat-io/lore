<p align="center"><img src="./lore-logo.webp" width="128" alt="Lore"></p>
<h1 align="center">Lore</h1>
<p align="center"><em>项目永远不会遗忘的记忆。</em></p>

<p align="center">
  <a href="https://docs.telepat.io/lore">📖 文档</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/lore/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/lore/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/lore"><img src="https://codecov.io/gh/telepat-io/lore/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/lore"><img src="https://img.shields.io/npm/v/@telepat/lore" alt="npm"></a>
  <a href="https://github.com/telepat-io/lore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

从你的项目内容构建并维护一个持久的 LLM 知识库。

Lore 将原始文件和 URL 转换为编译后的、可导航的 Markdown 百科，并在多个会话中保持可用。

## 它能解决什么问题

- 持久化知识，而非每次会话都重置。
- 编译后的 Markdown 百科（人类可读、Git 友好）。
- 通过反向链接和 SQLite FTS5/BM25 搜索实现快速检索。
- 支持混合来源：文档、代码笔记、URL、媒体字幕。

## 快速开始

```bash
# 1) 安装
npm install -g @telepat/lore

# 2) 在项目内创建 Lore 仓库
lore init

# 3) 添加素材
lore ingest ./README.md
lore ingest https://example.com/article

# 4) 编译为百科页面
lore compile

# 5) 搜索和提问
lore search "architecture"
lore query "How does this system work?"
```

## 环境要求

- Node.js 22+
- 可选：`yt-dlp`，用于视频字幕提取
  - macOS：`brew install yt-dlp`

## 工作原理

Lore 将内容提取到 `.lore/raw/`，编译为 `.lore/wiki/articles/` 中的链接百科文章，然后构建搜索索引和反向链接图。查询和搜索通过图和 FTS 索引解析。导出功能可将百科内容打包为 slides、PDF、docx、web、canvas 或 graphml 格式。

## 与 AI Agent 一起使用

Lore 内置一流的 MCP 服务器，供智能体集成：

- **MCP 服务器** — 运行 `lore mcp` 启动 stdio MCP 服务器，提供 13 个工具：
  - **检索：** `search`、`ask`、`list_articles`、`get_article`、`get_neighbors`、`path`
  - **图诊断：** `graph_stats`、`lint_summary`、`list_orphans`、`list_gaps`、`list_ambiguous`
  - **提取/维护：** `check_duplicate`、`list_raw_tags`、`rebuild_index`
- **兼容主机** — 支持 Claude Code、Cursor、VS Code Copilot 及任何 stdio MCP 客户端。
- **推荐智能体循环：** `list_orphans` → `list_gaps` → `list_ambiguous` → 编辑/编译 → `rebuild_index(repair=true)`。
- **Agent 文档** — [MCP 服务器指南](https://docs.telepat.io/lore/guides/mcp-server) 涵盖工具模式、示例调用和故障排查。

## 安全与信任

- 密钥在 OS 安全存储可用时保存（macOS Keychain、Linux/Windows 平台等效工具）。
- 如果安全存储不可用或显式禁用（`LORE_DISABLE_KEYTAR=true`），写入会失败并提示使用环境变量。
- Lore 不会以明文回退文件持久化密钥。

运行时环境变量（最高优先级）：

- `OPENROUTER_API_KEY`
- `REPLICATE_API_TOKEN`
- `LORE_CF_ACCOUNT_ID`、`LORE_CF_TOKEN`
- `LORE_DISABLE_KEYTAR`

## 文档与支持

- [文档站点](https://docs.telepat.io/lore)
- [快速上手](https://docs.telepat.io/lore/getting-started/quickstart)
- [内容提取](https://docs.telepat.io/lore/guides/ingesting-content)
- [编译百科](https://docs.telepat.io/lore/guides/compiling-your-wiki)
- [MCP 服务器](https://docs.telepat.io/lore/guides/mcp-server)
- [故障排查](https://docs.telepat.io/lore/guides/troubleshooting)
- [CLI 参考](https://docs.telepat.io/lore/reference/cli-reference)
- 语言支持：English 与 简体中文
- [仓库](https://github.com/telepat-io/lore)
- [npm 包](https://www.npmjs.com/package/@telepat/lore)

## 贡献

欢迎贡献。请参阅[开发指南](https://docs.telepat.io/lore/contributing/development)了解环境搭建、工作流和质量门禁。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
