---
sidebar_position: 1
---

# 配置

Lore 有两个配置范围，具有明确的运行时优先级。

## 配置范围

- **全局配置** (`~/.config/lore/config.json`) -- 非密钥全局值（例如 Cloudflare 账户 ID）
- **全局密钥**（操作系统钥匙串）-- OpenRouter、Replicate 和 Cloudflare 令牌
- **每仓库配置** (`.lore/config.json`) -- 模型、温度、可选 maxTokens、导出偏好

对凭证和账户范围设置使用全局范围。对每个项目的模型/运行时行为使用仓库范围。

## 每仓库设置

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.3,
  "maxTokens": 4096,
  "webExporter": "starlight"
}
```

有效值：

| 键 | 类型 | 说明 |
|---|---|---|
| `model` | string | OpenRouter 模型标识符 |
| `temperature` | number (`0` 到 `2`) | 创造性/随机性控制 |
| `maxTokens` | 正整数（可选） | 未设置时，Lore 省略 `max_tokens` |
| `webExporter` | `starlight` 或 `vitepress`（可选） | 导出目标偏好 |

`maxTokens` 是可选的。省略时，Lore 不发送 `max_tokens`，使用模型/提供商默认完成限制。

## 运行时优先级

Lore 按此顺序解析值：

1. 环境变量
2. 安全存储的密钥（钥匙串）
3. 非密钥配置文件

有效优先级示例：

- `TELEPAT_OPENROUTER_KEY` 覆盖存储的 OpenRouter 密钥
- `TELEPAT_REPLICATE_TOKEN`（或旧版 `TELEPAT_REPLICATE_TOKEN`）覆盖存储的 Replicate 密钥
- `LORE_CF_TOKEN` 覆盖存储的 Cloudflare 令牌
- `LORE_CF_ACCOUNT_ID` 覆盖全局配置的 Cloudflare 账户 ID

## 交互式编辑器

```bash
lore settings
```

在非 TTY 环境中，Lore 打印当前值并提醒使用子命令。

## 非交互式设置

### 列出和检查

```bash
# 列出有效设置（密钥已编辑）
lore settings list --scope all

# 读取一个仓库键
lore settings get model --scope repo

# 读取一个全局键
lore settings get cloudflareAccountId --scope global
```

### 写入设置

```bash
# 写入全局值
lore settings set openrouterApiKey <value> --scope global
lore settings set cloudflareAccountId <value> --scope global

# 写入仓库值
lore settings set model deepseek/deepseek-v4-pro --scope repo
lore settings set temperature 0.3 --scope repo
lore settings set maxTokens 4096 --scope repo
lore settings set webExporter starlight --scope repo
```

### 取消设置

```bash
# 取消全局值
lore settings unset openrouterApiKey --scope global
lore settings unset cloudflareToken --scope global

# 取消可选仓库值
lore settings unset maxTokens --scope repo

# 通过 set 取消 maxTokens 的替代语法
lore settings set maxTokens - --scope repo
```

## 团队配置文件

### 稳定生产配置文件

```json
{
  "model": "openai/gpt-4o",
  "temperature": 0.2,
  "maxTokens": 4096,
  "webExporter": "starlight"
}
```

### 探索配置文件

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.5
}
```

## 故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| `Unknown key for scope` | 键不属于提供的范围 | 使用全局键设置凭证，仓库键设置模型/运行时 |
| `temperature must be a number` | 提供了非数字值 | 使用 `0` 到 `2` 之间的数字温度 |
| `maxTokens must be an integer` | 提供了非整数值 | 使用正整数或取消设置 |
| CI/容器中密钥设置失败 | 钥匙串不可用或已禁用 | 使用环境变量和/或设置 `TELEPAT_DISABLE_KEYTAR=true` |

## 相关文档

- [凭证与密钥](./credentials-and-secrets.md)
- [LLM 模型](../reference/llm-models.md)
- [CLI 参考](../reference/cli-reference.md)