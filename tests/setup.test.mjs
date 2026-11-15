import test from 'node:test'
import assert from 'node:assert/strict'
import { registerSetup, setupView } from '../lib/setup.js'

const flush = () => new Promise((resolve) => setImmediate(resolve))
function harness() {
  let panel, inspections = 0, starts = [], job = null
  const checks = [
    { id: 'cli', label: 'CLI', state: 'missing', auto: true, detail: '未安装' },
    { id: 'java', label: 'Java', state: 'ok', auto: true, detail: 'Java 25' },
    { id: 'ghidra', label: 'Ghidra', state: 'manual', auto: false, detail: '需要 ARM64 组件' },
  ]
  const dispose = registerSetup({ dshGo: { panel: (_id, definition) => { panel = definition } } }, {}, {
    inspectEnvironment: async () => { inspections++; return { checks } },
    deploymentSnapshot: () => job,
    startDeployment: (_config, options) => { starts.push(options); job = { id: 'fixture', status: 'running', detail: '开始', log: [] }; return job },
  })
  return { panel, dispose, starts, inspections: () => inspections }
}
const scope = { sessionId: 'a' }
const signal = () => new AbortController().signal
const confirm = { value: { confirmed: true } }

test('activation inspects but never installs, even when confirm has no plan', async () => {
  const h = harness()
  try {
    await flush()
    assert.equal(h.inspections(), 1)
    assert.equal(h.starts.length, 0)
    assert.match(h.panel.actions['confirm-env'](scope, confirm).toast, /生成/)
    assert.equal(h.starts.length, 0)
  } finally { h.dispose() }
})

test('preparation lists only missing auto items and requires explicit confirmation', async () => {
  const h = harness()
  try {
    const prepared = await h.panel.actions['prepare-env'](scope).result(signal())
    assert.match(prepared.patch.deploymentPlan, /CLI/)
    assert.doesNotMatch(prepared.patch.deploymentPlan, /Java|Ghidra/)
    assert.equal(h.starts.length, 0)
    h.panel.actions['confirm-env'](scope, confirm)
    assert.deepEqual(h.starts, [{ ids: ['cli'] }])
    h.panel.actions['confirm-env'](scope, confirm)
    assert.equal(h.starts.length, 1)
  } finally { h.dispose() }
})

test('skip, forged confirmation, other sessions, and cancelled preparation do not install', async () => {
  const h = harness()
  try {
    await h.panel.actions['prepare-env'](scope).result(signal())
    h.panel.actions['confirm-env']({ sessionId: 'b' }, confirm)
    h.panel.actions['confirm-env'](scope, { value: { confirmed: false } })
    h.panel.actions['confirm-env'](scope, confirm)
    assert.equal(h.starts.length, 0)
    const controller = new AbortController(); controller.abort()
    await h.panel.actions['prepare-env'](scope).result(controller.signal)
    h.panel.actions['confirm-env'](scope, confirm)
    assert.equal(h.starts.length, 0)
  } finally { h.dispose() }
})

test('refresh invalidates a pending consent and disposal removes subscribers', async () => {
  const h = harness()
  let emitted = 0
  try {
    const stop = h.panel.data(scope, () => emitted++)
    await h.panel.actions['prepare-env'](scope).result(signal())
    await h.panel.actions['inspect-env'](scope).result(signal())
    h.panel.actions['confirm-env'](scope, confirm)
    assert.equal(h.starts.length, 0)
    stop()
    const before = emitted
    await h.panel.actions['prepare-env'](scope).result(signal())
    assert.equal(emitted, before)
  } finally { h.dispose() }
})

test('setup view exposes native confirmation and bounded action groups', () => {
  const view = setupView()
  assert.equal(view.v, 1)
  assert.equal(view.children.filter((node) => node.type === 'confirm')[0].id, 'confirm-env')
  for (const node of view.children.filter((node) => node.type === 'actions')) assert.ok(node.items.length <= 4)
})
