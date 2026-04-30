<p align="center"><img src="./assets/avatar/lore-logo.webp" width="128" alt="Lore"></p>
<h1 align="center">Lore</h1>
<p align="center"><em>从任何内容构建持久 LLM 知识库——编译 Markdown 百科，而非向量嵌入。</em></p>

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

Lore 从您的项目内容构建持久 LLM 知识库——编译 Markdown 百科，而非向量嵌入。

将原始文件、URL 和转录内容转化为由 LLM 图书管理员组织的可导航百科。一次摄入，编译后，您的知识在多次会话中保持可用，没有 RAG 的检索噪音。

专为需要 LLM 在跨会话中保留真实架构上下文的团队打造。

## 功能特性

- **编译 Markdown 百科，而非向量嵌入** — 结构化、人类可读、Git 友好。无不透明向量或检索噪音。
- **LLM 驱动的图书管理员** — LLM 像全职研究图书管理员一样，主动组织和交叉链接您的知识。
- **反向链接 + FTS5/BM25 搜索** — 快速精准检索，无需向量相似度噪音。通过链接直达相关概念。
- **代码驱动的工作流** — 确定性代码处理摄入、编译、索引和图构建。Token 用于知识组织，而非基础设施。
- **混合来源摄入** — 文档、代码笔记、URL、聊天记录、媒体文件。Lore 将其统一为一致的知识结构。
- **多格式导出** — 幻灯片、PDF、DOCX、HTML、Canvas、GraphML。您的知识不受专有格式限制。
- **智能体就绪的 MCP 服务器** — 13 个工具通过 stdio 提供检索、图谱诊断和维护。兼容任何 MCP 主机。
- **Git 友好且可移植** — 您的百科就是纯 Markdown 文件。提交、分支、随项目发布。

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
- [仓库](https://github.com/telepat-io/lore)
- [npm 包](https://www.npmjs.com/package/@telepat/lore)

## 贡献

欢迎贡献。请参阅[开发指南](https://docs.telepat.io/lore/contributing/development)了解环境搭建、工作流和质量门禁。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
