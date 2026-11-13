# Cry Bot

A local-first chat app for running a team of AI agents.

## Development

Use Node.js 24 or later and pnpm 10.33.0.

```sh
pnpm install --frozen-lockfile
pnpm dev:server
pnpm dev
```

## Verification

Run checks sequentially to limit memory use:

```sh
pnpm exec tsc -b
pnpm exec tsc -p tsconfig.server.json
pnpm lint
pnpm i18n:check
pnpm check:brand
pnpm vitest run --maxWorkers=2
```

## Self hosting

Configure model and tool providers locally. Announcements, model manifests, server update checks, phone relay and managed Composio require explicit operator URLs; they are off when unconfigured. Set `CRYBOT_DISABLE_MODEL_CATALOG_FETCH=1` to disable the public models.dev catalog.

Desktop packaging and publication are managed in a separate deployment repository.

## License

Apache-2.0. See LICENSE, NOTICE, CHANGES.md, LICENSING.md and third_party/.
