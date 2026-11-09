<!-- HYPRGATE NAPPLET MIRROR NOTICE:START -->
> This repository is a read-only mirror of the `live-chat` napplet from `hyprgate/gui`.
> Open issues and pull requests in https://github.com/hyprgate/gui.
> Do not push commits to this standalone napplet repository; direct changes are overwritten by Hyprgate's mirror workflow.
<!-- HYPRGATE NAPPLET MIRROR NOTICE:END -->

# Live Chat

Chat and zaps for whatever stream or radio station you're playing, using NIP-53 live chat
(kind 1311) and zap receipts (kind 9735). Each open stream gets a tab, and background tabs keep
counting unread messages.

Package: `@hyprgate/napp-live-chat`. Source lives in the Hyprgate monorepo at
`napplets/live-chat`. The standalone `hyprgate/napplet-live-chat` repository is a generated,
read-only mirror, so send changes to `hyprgate/web`.

## How it gets a stream

There's no picker in the app. It listens for `stream:channel-switch` from Stream and Radio, and
when it opens it asks with `stream:current-context-get`. The shell's player also has an Open chat
button that passes the context directly.

## Working on it

Run these from the Hyprgate checkout so `workspace:*` packages resolve:

```bash
pnpm install --frozen-lockfile
pnpm --filter ./napplets/live-chat paja        # Kehto Paja plus the Vite dev server
pnpm --filter ./napplets/live-chat exec vitest run
pnpm --filter ./napplets/live-chat type-check
pnpm --filter ./napplets/live-chat conformance # builds, then checks dist/
```
