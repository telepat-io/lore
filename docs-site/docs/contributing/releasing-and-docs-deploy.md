---
sidebar_position: 2
---

# Releasing and Docs Deploy

## Release Process

Releases are managed by [Release Please](https://github.com/googleapis/release-please). Push to `main` triggers a release PR. Merging the release PR publishes to npm.

## Docs Deployment

Docs are built with Docusaurus and deployed to GitHub Pages via the `docs-pages.yml` workflow. Triggers on push to `main` affecting `docs-site/**`.
