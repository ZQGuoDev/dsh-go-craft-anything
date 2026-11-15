import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bounded, registerMobile, statusView, toMobileData } from '../lib/mobile.js'

function harness(overrides = {}) {
  const on = new Map(), panels = new Map(), strips = new Map()
  let currentMode = 'clean', writes = [], probeCalls = []
  const bridge = { bridge: { enabled: true, allow: [] }, server: null, tools: null }
  let dispose
  const ctx = {
    inject(names, callback) { assert.deepEqual(names, ['dshGo']); dispose = callback(ctx) },
    on() {},
    dshGo: { on: (id, fn) => on.set(id, fn), panel: (id, value) => panels.set(id, value), strip: (id, fn) => strips.set(id, fn) },
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-mobile-'))
  registerMobile(ctx, { installDir: dir }, {
    readMode: () => currentMode,
    readBridge: () => bridge.bridge,
    bridgeReport: () => bridge,
    writeBridge: (_config, patch) => { writes.push(patch); Object.assign(bridge.bridge, patch) },
    statusReport: async (_config, options) => { probeCalls.push(options); return { installed: false, mode: currentMode } },
    setMode: async (_config, wanted) => { await Promise.resolve(); currentMode = wanted; return { applied: true } },
    inspectEnvironment: async () => ({ checks: [] }),
    deploymentSnapshot: () => null,
    ...overrides,
  })
  return { on, panel: panels.get('craft-status'), strips, writes, probeCalls, dispose: () => { dispose(); fs.rmSync(dir, { recursive: true, force: true }) } }
}

test('manifest stays inside native contribution and localization limits', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../manifest-mobile.json', import.meta.url)))
  assert.equal(manifest.v, 1)
  assert.deepEqual(manifest.wants, [])
  const c = manifest.contributes
  assert.equal(c['composer.actions'].length, 2)
  assert.equal(c['composer.strip'].length, 1)
  assert.equal(c.panels.length, 2)
  assert.equal(c.panels[1].id, 'craft-setup')
  assert.equal(c['composer.actions'][1].effect.page, 'panel:craft-status')
  const ids = Object.values(c).flat().map((x) => x.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const action of c['composer.actions']) for (const label of Object.values(action.label)) assert.ok(label.length <= 10)
})

test('comment-only YAML null config still registers the native panel', () => {
  const handlers = new Map(), panels = new Map()
  let dispose
  const ctx = {
    inject(_names, callback) { dispose = callback(ctx) },
    on() {},
    dshGo: {
      on: (id, fn) => handlers.set(id, fn),
      strip() {},
      panel: (id, def) => panels.set(id, def),
    },
  }
  try {
    registerMobile(ctx, null)
    assert.equal(typeof panels.get('craft-status')?.view, 'function')
    assert.deepEqual(handlers.get('open-craft')(), { open: 'panel:craft-status' })
  } finally { dispose?.() }
})

test('v1 panel binds all displayed values and groups <=4 actions', () => {
  const view = statusView()
  assert.equal(view.v, 1)
  for (const child of view.children) {
    assert.ok(['text', 'callout', 'keyValue', 'actions'].includes(child.type))
    if (child.type === 'actions') assert.ok(child.items.length <= 4)
  }
  const fields = view.children.find((child) => child.type === 'keyValue').items
  assert.ok(fields.length <= 24)
  assert.ok(fields.every(([, value]) => value.$.startsWith('data.')))
})

test('missing CLI and unknown counts never become synthetic tool counts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-mobile-data-'))
  try {
    const data = toMobileData({ installed: false, mcp: { defaultToolCount: 30 } }, { bridge: { enabled: true, allow: [] }, tools: null }, { installDir: dir })
    assert.equal(data.installed, '未安装')
    assert.equal(data.visibleTools, '尚未报告')
    assert.equal(data.capabilityTools, '尚未检测')
    assert.ok(data.architecture.includes(process.arch))
    const measured = toMobileData({ installed: true, capabilities: { tools: 38, enginesFound: ['java'] } }, { bridge: { enabled: true, allow: [] }, server: { mode: 'clean' }, tools: { visible: 0 } }, { installDir: dir })
    assert.equal(measured.visibleTools, '0')
    assert.equal(measured.capabilityTools, '38')
    assert.equal(measured.engines, 'java')
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('toggle waits for async setMode and reports new global mode', async () => {
  const h = harness()
  try {
    const result = h.on.get('toggle-mode')({}, {})
    assert.ok(result.pending.timeoutMs <= 60_000)
    assert.equal(typeof result.result, 'function')
    const effect = await result.result(new AbortController().signal)
    assert.match(effect.toast, /深度模式已生效/)
    assert.match(effect.patch.mode, /深度/)
    assert.equal(h.probeCalls.length, 0)
  } finally { h.dispose() }
})

test('bridge filters preserve disabled state; commands only copy', () => {
  const h = harness()
  try {
    h.panel.actions['bridge-off']()
    const effect = h.panel.actions['core-only']()
    assert.deepEqual(h.writes, [{ enabled: false }, { allow: ['core_*'] }])
    assert.match(effect.patch.bridge, /已关闭/)
    const copy = h.panel.actions['copy-commands']()
    assert.match(copy.copy, /craft_install/)
    assert.equal(copy.command, undefined)
    assert.equal(copy.insert, undefined)
  } finally { h.dispose() }
})

test('data watchers share probes, emit asynchronously and stop after dispose', async () => {
  let resolveProbe
  const h = harness({ statusReport: () => new Promise((resolve) => { resolveProbe = resolve }) })
  let panelEmits = 0, stripEmits = 0
  const stopPanel = h.panel.data({}, () => { panelEmits++ })
  const stopStrip = h.strips.get('craft-strip')({}, () => { stripEmits++ })
  await Promise.resolve()
  stopPanel()
  const before = panelEmits
  resolveProbe({ installed: false, mode: 'clean' })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(panelEmits, before)
  assert.ok(stripEmits > 1)
  stopStrip()
  h.dispose()
})

test('full refresh passes host timeout and abort signal', async () => {
  const h = harness()
  try {
    const effect = await h.panel.actions['full-status']().result(new AbortController().signal)
    assert.ok(effect.patch)
    assert.equal(h.probeCalls[0].full, true)
    assert.ok(h.probeCalls[0].signal instanceof AbortSignal)
    assert.equal(h.probeCalls[0].timeoutMs, 24_000)
  } finally { h.dispose() }
})

test('last watcher disposal aborts host probe and consumes its rejection', async () => {
  let probeSignal
  const h = harness({ statusReport: (_config, { signal }) => new Promise((_resolve, reject) => {
    probeSignal = signal
    signal.addEventListener('abort', () => reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })), { once: true })
  }) })
  let emits = 0
  const stop = h.panel.data({}, () => { emits++ })
  await Promise.resolve()
  stop()
  const before = emits
  assert.equal(probeSignal.aborted, true)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(emits, before)
  h.dispose()
})

test('cancelled mode pending never starts a write and host failures become toast', async () => {
  let modeCalls = 0
  const h = harness({ setMode: async () => { modeCalls++; throw new Error('fixture failure') } })
  try {
    const controller = new AbortController()
    const pending = h.panel.actions.deep()
    controller.abort()
    assert.deepEqual(await pending.result(controller.signal), { toast: '操作已取消' })
    assert.equal(modeCalls, 0)
    const failed = await h.panel.actions.deep().result(new AbortController().signal)
    assert.match(failed.toast, /检测未完成/)
    assert.equal(modeCalls, 1)
  } finally { h.dispose() }
})

test('bounded operations handle cancellation and late rejection', async () => {
  const controller = new AbortController()
  const result = bounded(() => new Promise(() => {}), controller.signal, 50)
  controller.abort()
  await assert.rejects(result, { name: 'AbortError' })
  await assert.rejects(bounded(() => new Promise(() => {}), undefined, 5), { name: 'TimeoutError' })
})
