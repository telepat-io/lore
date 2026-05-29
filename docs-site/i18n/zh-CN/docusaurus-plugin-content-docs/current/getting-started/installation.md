---
sidebar_position: 2
---

# 安装

## 前提条件

- **Node.js >= 22**（Ink 6 所需）
- **yt-dlp**（可选，用于视频字幕摄入）：`brew install yt-dlp`

## 平台说明

| 平台 | 说明 |
|---|---|
| macOS | 默认支持基于钥匙串的密钥存储 |
| Linux | 密钥存储取决于钥匙环/libsecret 的可用性 |
| CI/容器 | 建议使用环境变量并设置 `TELEPAT_DISABLE_KEYTAR=true` |

## 安装

```bash
npm install -g @telepat/lore
```

## 验证

```bash
lore --version
lore --help
```

## 首次设置清单

```bash
# 初始化仓库元数据
lore init

# 设置所需的 OpenRouter 密钥
lore settings set openrouterApiKey <value> --scope global

# 验证有效设置
lore settings list --scope all
```

## 可选依赖

| 功能 | 依赖项 | 是否必需 |
|---|---|---|
| 视频字幕摄入 | `yt-dlp` | 可选 |
| PDF/DOCX/PPTX/XLSX/EPUB 摄入 | Replicate 令牌 | 可选 |
| 图像 OCR 摄入 | Replicate 令牌 | 可选 |

## 故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| `command not found: lore` | 全局 npm bin 不在 PATH 中 | 确保 npm 全局 bin 在 shell PATH 中 |
| 无头环境中密钥设置失败 | 钥匙串不可用 | 使用环境变量 + `TELEPAT_DISABLE_KEYTAR=true` |
| 视频 URL 摄入无字幕 | `yt-dlp` 缺失或无字幕 | 安装 `yt-dlp` 或依赖 URL 回退 |

## 相关文档

- [快速开始](./quickstart.md)
- [配置](../guides/configuration.md)
- [凭证与密钥](../guides/credentials-and-secrets.md)