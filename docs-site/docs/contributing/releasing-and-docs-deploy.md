---
sidebar_position: 2
---

# Releasing and Docs Deploy

## Release Process

Releases are managed by [Release Please](https://github.com/googleapis/release-please).

High-level flow:

1. Pushes to `main` trigger Release Please workflow
2. Release Please opens or updates a release PR
3. Merging the release PR creates a release/tag
4. Publish job runs quality gates, then publishes npm package

## Mandatory Quality Gates

Release and CI workflows both enforce:

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

## Publishing Workflows

Two publish paths exist:

| Workflow | Trigger | Purpose |
|---|---|---|
| `release-please.yml` | push to `main` with release creation | Standard automated release + publish |
| `npm-publish.yml` | manual dispatch | Controlled manual publish with tag validation |

Manual publish workflow validates:

- tag format (`vX.Y.Z`)
- tag commit ancestry on `main`
- package name and version consistency
- full quality gates before publish

## Docs Deployment

Docs are built with Docusaurus and deployed to GitHub Pages via [docs-pages.yml](../../../.github/workflows/docs-pages.yml).

Trigger conditions:

- push to `main` that changes `docs-site/**`
- push to `main` that changes the docs workflow file
- manual workflow dispatch

Pipeline steps:

1. Install docs-site dependencies
2. Build static docs (`docs-site/build`)
3. Upload Pages artifact
4. Deploy with GitHub Pages action

## Local Preflight Before Release/Docs Changes

```bash
npm ci
npm --prefix docs-site ci
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Release PR not created | No releasable conventional changes detected | Confirm commit format and Release Please config |
| Publish job blocked | One or more quality gates failed | Reproduce locally, fix, and rerun |
| Docs deploy not triggered | Changed files outside trigger paths | Ensure docs-site or workflow path changed, or run manual dispatch |
| Manual publish rejected | Tag/version/ancestry validation failed | Use valid `vX.Y.Z` tag on a commit reachable from `main` |

## Related Docs

- [Development](./development.md)
- [CLI Reference](../reference/cli-reference.md)
