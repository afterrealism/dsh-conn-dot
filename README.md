# dsh-conn-dot

A green connection dot on the top-left brand mark of the DSH Web GUI — the
fish logo beside the product name — showing whether the UI is connected to
the `dsh web` server.

| dot | meaning |
|---|---|
| 🟢 green | connected — WebSocket live and/or probe answered |
| 🟡 amber | connecting / not yet determined |
| 🔴 red | disconnected, or the server stopped answering HTTP |

Two signals are merged:

1. **Live socket state** — subscribes to `ctx.connection.state` (the runtime's
   WebSocket recovery lifecycle: `connected` / `connecting` / `disconnected`).
2. **Background worker** — every 30 seconds, a same-origin `HEAD /` probe.
   Any HTTP response means the server is alive; a network-level rejection
   means broken. This catches a hung server whose socket stays half-open.

The dot shadows the `sidebar.brand.mark` slot at priority −10 and re-renders
the official `FishLogo`, so the logo itself is untouched; hover the dot for
status and the time of the last check.

## Install (web profile)

```sh
npm pack                     # produces dsh-conn-dot-0.1.0.tgz
dsh plugin --profile web add file:/absolute/path/dsh-conn-dot-0.1.0.tgz
```

Then add `"dsh-conn-dot"` to `dsh.profile.bundles` in
`$DSH_HOME/profiles/web/package.json` and restart `dsh web`.

## Test

```sh
node --test test/client.test.mjs
```
