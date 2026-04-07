# AGENTS

Short operational guide for agents working in this repository.

## Repository Map

- `src/bin/`: CLI entry
- `src/commands/`: command handlers
- `src/core/`: ingestion, compile, search/query, repo/db logic
- `src/ui/`: Ink/React TUI views
- `src/utils/`: helper utilities/parsers
- `src/__tests__/`: unit tests
- `e2e/flows/`: end-to-end behavior tests
- `docs-site/`: Docusaurus documentation site

## Backpressure (Mandatory)

Run these before handoff/PR, in order:

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

If behavior changed (commands/core/ui/integration paths), also run:

```bash
npm run test:e2e
```

## Command Truth Source

Use `package.json` scripts as canonical. Do not invent alternate command names.

## Quality Gates

- TypeScript strict mode is enabled.
- ESLint rejects `any` and unused vars (except `_`-prefixed args).
- Unit coverage threshold: `lines >= 80`, `branches >= 60`.
- CI and release workflows enforce lint + coverage + build + docs build.

## Editing Rules

- Keep changes minimal and scoped.
- Preserve existing ESM import style (`.js` specifiers in TS imports).
- Avoid touching unrelated files.
- Update docs when user-facing command behavior changes.

## Docs Update Policy (Mandatory)

- Always update documentation extensively for user-visible behavior changes.
- At minimum, update impacted surfaces across root docs and `docs-site/docs/` guides/reference pages.
- Treat documentation completeness as part of done criteria before handoff.

## Testing Guidance

- Unit tests: `src/__tests__/...`
- E2E tests: `e2e/flows/...` with mocked integrations in `e2e/mocks/...`
- Prefer targeted tests first, then full suite as needed.

## Docs Guidance

For user-facing docs, optimize for:

- clear value proposition
- simple quick start
- copy-paste command snippets
- links to deeper docs in `docs-site/docs/`
