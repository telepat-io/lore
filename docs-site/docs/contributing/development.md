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

## Testing

- Unit tests: `src/__tests__/` -- fast, no network, mocked externals
- E2E tests: `e2e/` -- real `.lore/` repos in tmpdir, HTTP intercepted via msw
