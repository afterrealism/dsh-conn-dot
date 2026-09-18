// Minimal runnable check: load lib/client.js in Node with a stubbed module
// loader and assert the signal-merge table that drives the dot color.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
let captured = null
globalThis.window = {
  __ModuleLoader__: {
    load(def) { captured = def },
  },
}
await import(path.join(dir, '..', 'lib', 'client.js'))

const reactStub = {
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  createElement: (...args) => args,
}
const mod = captured.factory((id) => {
  if (id === 'react') return reactStub
  if (id === '@deepseek-ai/dsh-client-ui-primitives') return { FishLogo: () => null }
  throw new Error('unexpected require: ' + id)
})

const { computeLevel, PROBE_INTERVAL_MS } = mod.__connDot

test('plugin shape', () => {
  assert.deepEqual(mod.inject, ['slots', 'connection'])
  assert.equal(typeof mod.apply, 'function')
})

test('probe cadence is 30s', () => {
  assert.equal(PROBE_INTERVAL_MS, 30000)
})

test('signal merge table', () => {
  const row = (conn, probeOk) => computeLevel({ conn, probeOk })
  // connected + probe ok/pending → green
  assert.equal(row('connected', true), 'up')
  assert.equal(row('connected', null), 'up')
  // probe failure wins over an optimistic socket → red (hung server)
  assert.equal(row('connected', false), 'down')
  // socket gone → red regardless of a stale good probe
  assert.equal(row('disconnected', true), 'down')
  assert.equal(row('disconnected', false), 'down')
  // probe alone can carry green when the socket has no outcome yet
  assert.equal(row(undefined, true), 'up')
  // nothing decided yet → amber
  assert.equal(row(undefined, null), 'warn')
  assert.equal(row('connecting', null), 'warn')
  assert.equal(row('connecting', true), 'up')
})
