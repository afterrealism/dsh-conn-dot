/**
 * dsh-conn-dot — browser bundle (self-contained, no cross-module imports).
 *
 * Shows a small status dot pinned to the top-left corner of the sidebar brand
 * mark (the fish logo, top-left of the UI beside the name):
 *   green  — UI is connected to the dsh web server
 *   amber  — connecting / not yet determined
 *   red    — disconnected or the server stopped answering
 *
 * Two signals are merged:
 *   1. ctx.connection.state — the runtime's WebSocket recovery lifecycle
 *      ('connected' | 'connecting' | 'disconnected'), subscribed live.
 *   2. A background worker: setInterval probe every 30s doing a same-origin
 *      HEAD request. Any HTTP response (even 404) means the server is alive;
 *      a network-level rejection means broken. Catches a hung server whose
 *      socket stays half-open.
 *
 * Rendering: registers into the 'sidebar.brand.mark' single slot with
 * priority -10 (lowest renders), wrapping the official FishLogo so the logo
 * itself is preserved — we re-render exactly what the shell's fallback uses.
 */
window.__ModuleLoader__.load({
  id: 'dsh-conn-dot',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    var react = require('react')

    // The official mark, re-rendered by us so shadowing the slot keeps the logo.
    var FishLogo = null
    try {
      FishLogo = require('@deepseek-ai/dsh-client-ui-primitives').FishLogo
    } catch (e) { /* primitives not loaded — dot renders over a transparent box */ }

    // ---------------------------------------------------------------- state

    var PROBE_INTERVAL_MS = 30000

    var state = {
      conn: undefined, // 'connected' | 'connecting' | 'disconnected' | undefined (no outcome yet)
      probeOk: null,   // true | false | null (probe never completed)
      lastCheck: null, // Date | null
      lastError: null, // string | null
    }

    var listeners = []
    function emit() {
      for (var i = 0; i < listeners.length; i++) listeners[i]()
    }
    function subscribe(fn) {
      listeners.push(fn)
      return function () {
        var j = listeners.indexOf(fn)
        if (j >= 0) listeners.splice(j, 1)
      }
    }

    /** Pure merge of the two signals → 'up' | 'warn' | 'down'. */
    function computeLevel(s) {
      if (s.conn === 'disconnected') return 'down'
      if (s.probeOk === false) return 'down'
      if (s.conn === 'connected') return 'up'
      if (s.probeOk === true) return 'up'
      return 'warn'
    }

    function level() { return computeLevel(state) }

    function tooltipText() {
      var l = level()
      var label = l === 'up'
        ? 'Connected to the dsh web server'
        : l === 'warn' ? 'Connecting to the dsh web server…'
          : 'Disconnected — the dsh web server is not answering'
      var checked = state.lastCheck ? ' · last check ' + state.lastCheck.toLocaleTimeString() : ''
      var err = state.lastError ? ' · ' + state.lastError : ''
      return label + checked + err
    }

    // ------------------------------------------------------ background probe

    var probeTimer = null

    function probe() {
      var settled = false
      function finish(ok, err) {
        if (settled) return
        settled = true
        state.probeOk = ok
        state.lastCheck = new Date()
        state.lastError = err || null
        emit()
      }
      try {
        fetch('/', { method: 'HEAD', cache: 'no-store' })
          .then(function () { finish(true) })
          .catch(function (e) { finish(false, e && (e.message || String(e))) })
      } catch (e) {
        finish(false, e && (e.message || String(e)))
      }
    }

    // -------------------------------------------------------------- component

    var COLORS = { up: '#22c55e', warn: '#eab308', down: '#ef4444' }

    function BrandMarkWithDot(props) {
      var size = (props && props.size) || 24
      var setTick = react.useState(0)[1]
      react.useEffect(function () {
        return subscribe(function () { setTick(function (n) { return n + 1 }) })
      }, [])
      var color = COLORS[level()]
      var title = tooltipText()
      var children = []
      if (FishLogo) children.push(react.createElement(FishLogo, { size: size, key: 'logo' }))
      return react.createElement('span', {
        key: 'wrap',
        style: {
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          width: size + 'px',
          height: size + 'px',
        },
      },
        children,
        react.createElement('span', {
          key: 'dot',
          title: title,
          'aria-label': title,
          role: 'status',
          style: {
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: color,
            boxShadow: '0 0 0 2px var(--dsw-specific-sidebar-fill, rgba(0,0,0,0.001))',
          },
        }))
    }

    // ------------------------------------------------------------------ apply

    var inject = ['slots', 'connection']

    function apply(ctx) {
      var disposers = []

      // Signal 1: live WebSocket recovery state.
      try {
        var src = ctx.connection && ctx.connection.state
        if (src && typeof src.getSnapshot === 'function' && typeof src.subscribe === 'function') {
          state.conn = src.getSnapshot()
          disposers.push(src.subscribe(function () {
            state.conn = src.getSnapshot()
            emit()
          }))
        }
      } catch (e) { /* connection service absent — probe-only mode */ }

      // Signal 2: background liveness worker, every 30s (plus one immediate).
      probe()
      probeTimer = setInterval(probe, PROBE_INTERVAL_MS)
      disposers.push(function () {
        if (probeTimer) { clearInterval(probeTimer); probeTimer = null }
      })

      ctx.effect(function () {
        return function () {
          for (var i = 0; i < disposers.length; i++) disposers[i]()
        }
      }, 'dsh-conn-dot: teardown')

      ctx.slots.inject('sidebar.brand.mark', function () {
        return ctx.slots.register(
          { name: 'sidebar.brand.mark', priority: -10 },
          BrandMarkWithDot,
        )
      })
    }

    exports.inject = inject
    exports.apply = apply
    exports.__connDot = { computeLevel: computeLevel, PROBE_INTERVAL_MS: PROBE_INTERVAL_MS }
    return module.exports
  },
})
