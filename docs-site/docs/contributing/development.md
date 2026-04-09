---
sidebar_position: 1
---

# Development

## Setup

```bash
git clone https://github.com/telepat-io/lore.git
cd lore
npm install
```

## Repository Map

| Path | Purpose |
|---|---|
| `src/bin/` | CLI entrypoint |
| `src/commands/` | command handlers |
| `src/core/` | ingestion/compile/query/search/runtime modules |
| `src/ui/` | Ink TUI views |
| `src/utils/` | parsing and helper utilities |
| `src/__tests__/` | unit tests |
| `e2e/flows/` | end-to-end command behavior tests |
| `docs-site/` | Docusaurus docs site |

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run CLI in dev mode |
| `npm run build` | Build with tsup |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Typecheck + ESLint |
| `npm test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run test:all` | All tests |
| `npm run docs:start` | Run docs locally |
| `npm run docs:build` | Build docs site |

## Mandatory Backpressure Checks

Run these before PR/release handoff:

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

When behavior changes in command/core/ui/integration paths, also run:

```bash
npm run test:e2e
```

## Testing

- Unit tests: `src/__tests__/` -- fast, no network, mocked externals
- E2E tests: `e2e/` -- real `.lore/` repos in tmpdir, HTTP intercepted via msw

## Contributor Workflow

1. Create focused branch
2. Implement changes with minimal scope
3. Add/update tests in relevant unit or e2e areas
4. Update docs for user-visible behavior changes
5. Run mandatory checks
6. Open PR with behavior summary and validation notes

## Documentation Contribution Rules

- update root docs and docs-site pages for user-visible behavior changes
- include practical examples for new command behavior
- ensure new docs pages are linked from existing navigation surfaces

## Troubleshooting Dev Environment

| Symptom | Likely cause | Fix |
|---|---|---|
| Typecheck passes locally but CI fails | Node/version mismatch | Use Node 22+ locally |
| Jest ESM errors | VM modules flag missing | Use package scripts instead of raw jest invocation |
| Docs build breaks unexpectedly | Broken links/sidebar entries | Run `npm run docs:build` and fix path references |

## Related Docs

- [Releasing and Docs Deploy](./releasing-and-docs-deploy.md)
- [CLI Reference](../reference/cli-reference.md)
- [Architecture](../technical/architecture.md)
