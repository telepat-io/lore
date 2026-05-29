---
sidebar_position: 2
---

# 凭证与密钥

API 密钥全局存储（而非每仓库），以避免意外的 git 提交。

默认情况下，Lore 将密钥存储在操作系统安全存储中（例如 macOS 钥匙串）。

## 密钥存储模型

Lore 将密钥值存储在基于钥匙串的存储中，不写入明文密钥文件。

- 存储的密钥键：`openrouterApiKey`、`replicateApiToken`、`cloudflareToken`
- 存储的非密钥全局键：`cloudflareAccountId`
- 仓库配置包含模型/运行时设置，不包含密钥令牌

## 必需

- **OpenRouter API 密钥** -- 用于核心 LLM 操作（编译、查询、解释和决策捕获）

## 可选

- **Replicate API 密钥** -- 用于 PDF/DOCX 解析（marker）和图像 OCR（vision）
- **Cloudflare 凭证** -- 用于浏览器渲染 URL 获取（Jina 的替代方案）

## 运行时解析顺序

1. 环境变量
2. 钥匙串密钥
3. 非密钥配置值

实际影响：

- 环境值可以临时覆盖存储的凭证，用于 CI 作业
- 如果钥匙串不可用，读取不会返回密钥值，写入会失败并提示使用环境变量

## 设置密钥

```bash
lore settings
```

或使用非交互式命令：

```bash
lore settings set openrouterApiKey <value> --scope global
lore settings set replicateApiToken <value> --scope global
lore settings set cloudflareToken <value> --scope global
lore settings set cloudflareAccountId <value> --scope global
```

取消设置示例：

```bash
lore settings unset openrouterApiKey --scope global
lore settings unset replicateApiToken --scope global
lore settings unset cloudflareToken --scope global
lore settings unset cloudflareAccountId --scope global
```

也支持环境变量：

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`（支持旧版别名：`TELEPAT_REPLICATE_TOKEN`）
- `LORE_CF_ACCOUNT_ID`
- `LORE_CF_TOKEN`
- `TELEPAT_DISABLE_KEYTAR`（设置 `true` 以禁用钥匙串访问）

## CI 和容器模式

对于非交互式环境，建议使用环境变量：

```bash
export TELEPAT_OPENROUTER_KEY="..."
export TELEPAT_REPLICATE_TOKEN="..."
export LORE_CF_ACCOUNT_ID="..."
export LORE_CF_TOKEN="..."
export TELEPAT_DISABLE_KEYTAR=true
```

这避免了在临时环境中依赖钥匙串。

## Cloudflare 与 Jina URL 解析

- 如果设置了 `LORE_CF_ACCOUNT_ID` 和 `LORE_CF_TOKEN`，Lore 会首先尝试 Cloudflare 浏览器渲染
- Cloudflare 失败时，Lore 自动回退到 Jina
- 没有 Cloudflare 凭证时，Lore 直接使用 Jina

## 故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| `No OpenRouter API key configured` | 环境或钥匙串中无密钥 | 设置 `TELEPAT_OPENROUTER_KEY` 或运行设置命令 |
| 密钥写入失败，钥匙串错误 | 环境中钥匙串不可用 | 设置环境变量和 `TELEPAT_DISABLE_KEYTAR=true` |
| Replicate 解析器在文档/图像摄入时失败 | `TELEPAT_REPLICATE_TOKEN` 缺失 | 全局设置 Replicate 令牌或通过环境变量 |
| Cloudflare URL 获取未使用 | 缺少 Cloudflare 账户 ID 或令牌 | 同时设置 `LORE_CF_ACCOUNT_ID` 和 `LORE_CF_TOKEN` |

当钥匙串访问被禁用或不可用时，Lore 不会回退到明文密钥文件，需要环境变量来提供密钥值。

## 相关文档

- [配置](./configuration.md)
- [支持的格式](../reference/supported-formats.md)
- [环境变量](../reference/environment-variables.md)