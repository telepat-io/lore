---
sidebar_position: 2
---

# 发布和文档部署

## 发布流程

发布由 [Release Please](https://github.com/googleapis/release-please) 管理。

高级流程：

1. 推送到 `main` 触发 Release Please 工作流
2. Release Please 打开或更新发布 PR
3. 合并发布 PR 创建发布/标签
4. 发布作业运行质量门，然后发布 npm 包

## 强制质量门

发布和 CI 工作流都强制执行：

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

## 发布工作流

存在两个发布路径：

| 工作流 | 触发器 | 用途 |
|---|---|---|
| `release-please.yml` | 推送到 `main` 并创建发布 | 标准自动化发布 + 发布 |
| `npm-publish.yml` | 手动分发 | 带标签验证的受控手动发布 |

手动发布工作流验证：

- 标签格式（`vX.Y.Z`）
- `main` 上的标签提交祖先关系
- 包名和版本一致性
- 发布前的完整质量门

## 文档部署

文档使用 Docusaurus 构建，并通过 [docs-pages.yml](https://github.com/telepat-io/lore/blob/main/.github/workflows/docs-pages.yml) 部署到 GitHub Pages。

触发条件：

- 推送到 `main` 并更改 `docs-site/**`
- 推送到 `main` 并更改文档工作流文件
- 手动工作流分发

管道步骤：

1. 安装文档站点依赖
2. 构建静态文档（`docs-site/build`）
3. 上传 Pages 产物
4. 使用 GitHub Pages 操作部署

## 发布/文档更改前的本地预检

```bash
npm ci
npm --prefix docs-site ci
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

## 故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| 未创建发布 PR | 未检测到可发布的常规更改 | 确认提交格式和 Release Please 配置 |
| 发布作业被阻止 | 一个或多个质量门失败 | 本地重现、修复并重新运行 |
| 文档部署未触发 | 更改的文件在触发路径之外 | 确保文档站点或工作流路径已更改，或运行手动分发 |
| 手动发布被拒绝 | 标签/版本/祖先关系验证失败 | 使用有效的 `vX.Y.Z` 标签，位于从 `main` 可达的提交上 |

## 相关文档

- [开发](./development.md)
- [CLI 参考](../reference/cli-reference.md)