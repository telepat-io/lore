---
sidebar_position: 1
---

# 开发

## 设置

```bash
git clone https://github.com/telepat-io/lore.git
cd lore
npm install
```

## 仓库地图

| 路径 | 用途 |
|---|---|
| `src/bin/` | CLI 入口 |
| `src/commands/` | 命令处理器 |
| `src/core/` | 摄入/编译/查询/搜索/运行时模块 |
| `src/ui/` | Ink TUI 视图 |
| `src/utils/` | 解析和辅助实用程序 |
| `src/__tests__/` | 单元测试 |
| `e2e/flows/` | 端到端命令行为测试 |
| `docs-site/` | Docusaurus 文档站点 |

## 脚本

| 脚本 | 描述 |
|---|---|
| `npm run dev` | 在开发模式下运行 CLI |
| `npm run build` | 使用 tsup 构建 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | 类型检查 + ESLint |
| `npm test` | 单元测试 |
| `npm run test:e2e` | E2E 测试 |
| `npm run test:all` | 所有测试 |
| `npm run docs:start` | 在本地运行文档 |
| `npm run docs:build` | 构建文档站点 |

## 强制反压检查

在 PR/发布交付前运行这些：

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

当命令/核心/UI/集成路径中的行为发生更改时，也运行：

```bash
npm run test:e2e
```

## 测试

- 单元测试：`src/__tests__/` -- 快速、无网络、模拟外部依赖
- E2E 测试：`e2e/` -- tmpdir 中的真实 `.lore/` 仓库，通过 msw 拦截 HTTP

## 贡献者工作流

1. 创建专注分支
2. 以最小范围实现更改
3. 在相关的单元或 e2e 区域添加/更新测试
4. 为用户可见的行为更改更新文档
5. 运行强制检查
6. 打开包含行为摘要和验证说明的 PR

## 文档贡献规则

- 为用户可见的行为更改更新根文档和文档站点页面
- 为新命令行为包含实际示例
- 确保新文档页面从现有导航表面链接

## 开发环境故障排除

| 症状 | 可能原因 | 修复方法 |
|---|---|---|
| Typecheck 本地通过但 CI 失败 | Node/版本不匹配 | 本地使用 Node 22+ |
| Jest ESM 错误 | VM 模块标志缺失 | 使用包脚本而非原始 jest 调用 |
| 文档构建意外中断 | 断开的链接/侧边栏条目 | 运行 `npm run docs:build` 并修复路径引用 |

## 相关文档

- [发布和文档部署](./releasing-and-docs-deploy.md)
- [CLI 参考](../reference/cli-reference.md)
- [架构](../technical/architecture.md)