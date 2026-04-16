# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this
repository.

## Project Overview

A TypeScript (ES Module) CLI tool for managing Cloudflare Tunnels configuration
and DNS records via the official `cloudflare` SDK (v5). All operations go
through the `CloudflareTunnelManager` class which wraps the SDK.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Compile TypeScript (tsc -> dist/)
pnpm check            # Type-check without emitting (tsc --noEmit)
pnpm cli <cmd> [opts] # Run compiled CLI (node dist/cli.js)
pnpm cli:dev <cmd>    # Run CLI in dev mode without compiling (ts-node loader)
pnpm format           # Format with prettier
```

Running standalone scripts:

```bash
npx tsx sync-config.ts [config-path]   # Sync local JSON config to cloud
npx tsx check-dns.ts                   # Check/create missing DNS CNAME records
```

No test framework or linter is configured.

## Architecture

```
src/tunnel-manager.ts  — Core library (CloudflareTunnelManager class)
src/cli.ts             — CLI entry point (hand-rolled arg parser, no framework)
sync-config.ts         — Standalone: reads JSON config, diffs against cloud, batch-updates
check-dns.ts           — Standalone: reads JSON config, creates missing CNAME records
example-usage.ts       — Demo script showing API usage patterns
```

**Data flow:** CLI args + env vars → `cli.ts` → `CloudflareTunnelManager` →
Cloudflare API (via `cloudflare` SDK v5). Standalone scripts follow the same
path but read config from JSON files.

### CloudflareTunnelManager (`src/tunnel-manager.ts`)

The single core class. Constructor takes `(apiToken, accountId)` and creates a
`Cloudflare` SDK client.

Key interfaces: `IngressRule`, `TunnelConfig`, `ServiceConfig`.

SDK endpoints used:

- `client.zeroTrust.tunnels.cloudflared.configurations.get/update` — tunnel
  config CRUD
- `client.dns.records.create/delete/list` — DNS record CRUD
- `client.zeroTrust.tunnels.list` — list tunnels
- `client.zones.list` — list zones (for DNS zone resolution in check-dns.ts)

Important behavior: tunnel ingress rules must end with a catch-all
`{ service: "http_status:404" }` rule. `addOrUpdateService` inserts before the
catch-all; `removeService` strips it then re-appends.

### CLI (`src/cli.ts`)

Commands: `list`, `show`, `add`, `remove`, `batch`, `dns-add`, `dns-remove`.
Credentials come from env vars (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
or `--api-token`/`--account-id` args.

## Key Conventions

- **ES Modules only** — `"type": "module"` in package.json; imports use `.js`
  extensions
- **TypeScript strict mode** enabled
- **pnpm** is the package manager (v10.24.0)
- **No tests exist** — no test framework is configured
- **Comments and user-facing messages are in Chinese**
- SDK type casts: `TunnelConfig` → SDK's expected shape uses `as unknown as`
  casts because the SDK's types don't match the actual API response shape
  exactly
