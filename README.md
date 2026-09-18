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

## 中文说明 / Chinese

在 DSH Web GUI 品牌标记（产品名旁边的鱼形图标）左上角显示一个绿色连接状态点，
表示 UI 与 `dsh web` 服务器的连接状况：

| 状态点 | 含义 |
|---|---|
| 🟢 绿色 | 已连接 — WebSocket 在线且/或探测有响应 |
| 🟡 黄色 | 正在连接 / 尚未确定 |
| 🔴 红色 | 已断开，或服务器停止响应 HTTP |

合并两路信号：① 实时订阅 `ctx.connection.state`（WebSocket 恢复生命周期）；
② 后台每 30 秒发起同源 `HEAD /` 探测，任何 HTTP 响应都算存活，
网络层失败才算断开——可捕获 socket 半开、服务器假死的情况。
悬停状态点可查看状态与上次检查时间；界面语言为中文时提示自动切换为中文
（依据浏览器语言，`zh-*` 自动识别）。
