---
sidebar_position: 3
---

# 环境变量

环境变量在运行时对钥匙串和配置文件值具有最高优先级。

| 变量 | 描述 |
|---|---|
| `TELEPAT_OPENROUTER_KEY` | 用于编译/查询/解释/angela 的 OpenRouter API 密钥 |
| `TELEPAT_REPLICATE_TOKEN` | 用于 Marker/Vision 摄入解析器的 Replicate 令牌 |
| `TELEPAT_REPLICATE_TOKEN` | Replicate 令牌的旧版别名 |
| `LORE_CF_ACCOUNT_ID` | 用于浏览器渲染的 Cloudflare 账户 ID |
| `LORE_CF_TOKEN` | 用于浏览器渲染的 Cloudflare API 令牌 |
| `TELEPAT_DISABLE_KEYTAR` | 设置为 `true` 时，禁用钥匙串访问并需要环境变量提供密钥 |
| `LORE_QUERY_NORMALIZE` | 设置为 `true` 时，默认启用保守的查询文本清理 |
| `LORE_LOG_MAX_FILES` | 轮换前保留的最大 `.lore/logs/*.jsonl` 文件数 |

## 优先级模型

Lore 按此顺序解析值：

1. 环境变量
2. 存储的密钥/配置值
3. 内置默认值

示例：

- `TELEPAT_OPENROUTER_KEY` 覆盖钥匙串存储的 OpenRouter 值
- `TELEPAT_REPLICATE_TOKEN` 覆盖钥匙串存储的 Replicate 值
- `LORE_CF_TOKEN` 覆盖钥匙串存储的 Cloudflare 令牌
- `LORE_CF_ACCOUNT_ID` 覆盖全局配置账户 ID

## 查询标准化

全局启用标准化：

```bash
LORE_QUERY_NORMALIZE=true lore query "wat did we decied about deploy freeze"
```

每个命令显式启用标准化：

```bash
lore query --normalize-question "wat did we decied about deploy freeze"
```

`lore query` 不暴露 `--no-normalize-question` 标志。如果你通过环境变量启用了标准化，对于需要精确原始查询文本的运行，请取消设置 `LORE_QUERY_NORMALIZE`。

## 常见环境配置文件

### CI/容器配置文件

```bash
export TELEPAT_OPENROUTER_KEY="..."
export TELEPAT_REPLICATE_TOKEN="..."
export LORE_CF_ACCOUNT_ID="..."
export LORE_CF_TOKEN="..."
export TELEPAT_DISABLE_KEYTAR=true
```

### 本地高级用户配置文件

```bash
export LORE_QUERY_NORMALIZE=true
export LORE_LOG_MAX_FILES=500
```

## 日志保留说明

`LORE_LOG_MAX_FILES` 控制 Lore 在 `.lore/logs/` 中保留多少个 `.jsonl` 运行日志。

- 无效/非正值回退到默认保留
- 在创建每个新运行日志前运行清理

## 相关文档

- [配置](../guides/configuration.md)
- [凭证与密钥](../guides/credentials-and-secrets.md)
- [运行日志](../technical/logging.md)