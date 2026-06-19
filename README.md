# napplet-live-chat

[![CI](https://github.com/hyprgate/napplet-live-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/hyprgate/napplet-live-chat/actions/workflows/ci.yml)

Forkable source repository for the Hyprgate built-in napplet currently packaged as `@hyprgate/napp-live-chat`.

This repository was split from `hyprgate/gui` and is mounted back into the parent checkout as `napplets/live-chat`.
It still expects the parent workspace when built through Hyprgate because shared `@hyprgate/*` packages remain workspace dependencies.

## Parent checkout

```bash
git clone --recurse-submodules git@github.com:hyprgate/gui.git
cd gui
pnpm install --frozen-lockfile
pnpm --filter @hyprgate/napp-live-chat build
```

## Testing

Run these checks from a Hyprgate parent checkout so workspace dependencies resolve:

```bash
git clone --recurse-submodules git@github.com:hyprgate/gui.git
cd gui
pnpm install --frozen-lockfile
pnpm --filter @hyprgate/napp-live-chat conformance
pnpm --filter @hyprgate/napp-live-chat test
pnpm --filter @hyprgate/napp-live-chat build
```

The `conformance` script builds the napplet and runs `@napplet/conformance-cli` against `dist/`. CI runs the same conformance, unit test, and build checks for every push and pull request.
