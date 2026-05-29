---
sidebar_position: 4
---

# LLM 模型

Lore 使用 OpenRouter 进行核心 LLM 操作（例如编译、查询、解释和 angela 决策捕获）。在 `.lore/config.json` 中配置模型：

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

`maxTokens` 是可选的。如果设置，Lore 使用该值发送 `max_tokens`。如果未设置，Lore 省略 `max_tokens` 并依赖提供商/模型默认输出限制。

## 模型选择指南

将其作为实用的起点，然后根据你自己的延迟/成本/质量目标进行调整。

| 工作负载 | 建议模型风格 | 原因 |
|---|---|---|
| 大型多文档编译运行 | 长上下文、成本高效的模型 | 更好地容忍更大的源窗口 |
| 交互式查询/解释循环 | 平衡质量/速度的模型 | 快速迭代同时保持答案质量 |
| 决策捕获（Angela） | 高指令遵循模型 | 更清晰简洁的决策摘要 |

## 按意图建议的默认值

| 意图 | 示例配置 |
|---|---|
| 稳定性优先 | `temperature: 0.2`，设置 `maxTokens` |
| 探索优先 | `temperature: 0.4-0.6`，可选 `maxTokens` |
| 成本控制 | 较低的 `maxTokens`，频繁运行增量编译 |

## 推荐模型

- `deepseek/deepseek-v4-pro` -- 强大的长上下文和多语言性能
- `openai/gpt-4o` -- 强大的质量/速度平衡
- `anthropic/claude-3.5-sonnet` -- 强大的推理能力
- `google/gemini-pro-1.5` -- 大上下文窗口

## 配置示例

### 平衡默认

```json
{
  "model": "openai/gpt-4o",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

### 长上下文编译重点

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.2
}
```

### 创造性综合重点

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "temperature": 0.6,
  "maxTokens": 6000
}
```

## 温度和 maxTokens 调整

| 设置 | 较低值效果 | 较高值效果 |
|---|---|---|
| `temperature` | 更确定性的输出 | 更多样化的措辞和结构 |
| `maxTokens` | 更紧凑的响应，更低的输出成本 | 更长的响应，更高的输出成本 |

编译可靠性说明：

- 如果编译批处理响应被截断（`finish_reason=length`），Lore 会使用更小的批处理重试。
- 将 `maxTokens` 设置得太低可能会增加大型源集的重试频率。

## Replicate 模型

- `cuuupid/marker` -- PDF/文档提取（`.pdf`、`.docx`、`.pptx`、`.xlsx`、`.epub`）
- `yorickvp/llava-13b` -- 图像 OCR/说明（`.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`、`.bmp`）

Replicate 模型用于摄入解析，而非编译/查询/解释生成。

## 说明

- OpenRouter 模型选择是每仓库的（`.lore/config.json`）。
- OpenRouter 凭证可通过 `lore settings set openrouterApiKey <value> --scope global` 或 `TELEPAT_OPENROUTER_KEY` 设置。
- Replicate 凭证可通过 `lore settings set replicateApiToken <value> --scope global` 或 `TELEPAT_REPLICATE_TOKEN` 设置。
- 环境变量在运行时优先于存储的设置。

## 相关文档

- [配置](../guides/configuration.md)
- [凭证与密钥](../guides/credentials-and-secrets.md)
- [编译你的 Wiki](../guides/compiling-your-wiki.md)