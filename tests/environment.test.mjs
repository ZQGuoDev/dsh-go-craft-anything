import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createEnvironmentService, inspectEnvironment } from '../lib/environment.js'

const check = (id, state = 'missing', auto = true) => ({ id, label: id, state, auto, detail: state })
const tick = () => new Promise((resolve) => setImmediate(resolve))
async function finish(service, config = {}) {
  for (let i = 0; i < 30; i++) {
    await tick()
    const job = service.deploymentSnapshot(config)
    if (job.status !== 'running') return job
  }
  throw new Error('stub deployment did not settle')
}
function stub(overrides = {}) {
  const ready = new Set(), installed = [], inspections = []
  const backend = {
    root: (config) => config.installDir || '/test/root',
    inspect: async (_config, options) => { inspections.push(options); return { checks: ['cli', 'java', 'gdb', 'coding-agent'].map((id) => check(id, ready.has(id) ? 'ok' : 'missing')) } },
    install: async (_config, id) => { installed.push(id); ready.add(id) },
    ...overrides,
  }
  return { service: createEnvironmentService(backend, new Map()), ready, installed, inspections }
}

test('requires an explicit allowed plan without accepting additions', () => {
  const { service } = stub()
  for (const ids of [undefined, [], 'cli', ['cli', 'unknown'], ['cli', 2]]) assert.throws(() => service.startDeployment({}, { ids }))
  assert.equal(service.deploymentSnapshot(), null)
})

test('starts immediately, locks root aliases, deduplicates and skips now-existing tools', async () => {
  let resume
  const waiting = new Promise((resolve) => { resume = resolve })
  const h = stub({ inspect: async () => { await waiting; return { checks: [check('cli', 'ok')] } } })
  const started = h.service.startDeployment({ installDir: '/test/root/../root' }, { ids: ['cli', 'cli'] })
  assert.equal(started.status, 'running')
  assert.deepEqual(started.ids, ['cli'])
  assert.throws(() => h.service.startDeployment({ installDir: '/test/root' }, { ids: ['java'] }), /正在进行/)
  resume()
  const done = await finish(h.service)
  assert.equal(done.status, 'done')
  assert.deepEqual(h.installed, [])
  assert.match(done.log, /跳过/)
})

test('installs sequentially, re-detects before each and verifies afterwards', async () => {
  let installing = false
  const h = stub({ install: async (_config, id) => {
    assert.equal(installing, false)
    installing = true
    await tick()
    h.installed.push(id)
    h.ready.add(id)
    // Another environment becoming available while installing must be skipped.
    if (id === 'cli') h.ready.add('java')
    installing = false
  } })
  h.service.startDeployment({}, { ids: ['cli', 'java', 'gdb'] })
  const done = await finish(h.service)
  assert.equal(done.status, 'done')
  assert.deepEqual(h.installed, ['cli', 'gdb'])
  assert.equal(h.inspections.length, 5)
  assert.ok(h.inspections.every((options) => options.full === true && options.signal === undefined))
  h.service.startDeployment({}, { ids: ['java'] })
  assert.equal((await finish(h.service)).status, 'done')
})

test('installer failure and incompatible post-install verification fail and stop plan', async () => {
  for (const install of [async () => { throw new Error('download failed') }, async () => {}]) {
    const h = stub({ install })
    h.service.startDeployment({}, { ids: ['cli', 'java'] })
    const job = await finish(h.service)
    assert.equal(job.status, 'failed')
    assert.match(job.error, /download failed|未通过验证/)
    assert.equal(h.inspections.length, job.error.includes('download failed') ? 1 : 2)
  }
})

test('manual and unknown environments never invoke installer; logs stay bounded', async () => {
  for (const state of ['manual', 'unknown']) {
    let calls = 0
    const h = stub({ inspect: async () => ({ checks: [check('cli', state, false)] }), install: async () => { calls++ } })
    h.service.startDeployment({}, { ids: ['cli'] })
    assert.equal((await finish(h.service)).status, 'failed')
    assert.equal(calls, 0)
  }
  const h = stub({ install: async (_config, _id, job) => { job.log.push(...Array(200).fill('x'.repeat(2000))); throw new Error('e'.repeat(3000)) } })
  h.service.startDeployment({}, { ids: ['cli'] })
  const job = await finish(h.service)
  assert.ok(job.error.length <= 800)
  assert.ok(job.log.length <= 30 * 501)
})

test('inspection forwards cancellation, deployment does not inherit pending signals', async () => {
  const abort = new AbortController()
  const h = stub()
  abort.abort()
  await assert.rejects(h.service.inspectEnvironment({}, { signal: abort.signal }), { name: 'AbortError' })
  assert.equal(h.inspections.length, 0)
  h.service.startDeployment({}, { ids: ['cli'] })
  assert.equal((await finish(h.service)).status, 'done')
  const inFlight = new AbortController()
  let release
  const pending = stub({ inspect: () => new Promise((resolve) => { release = resolve }) })
  const observation = pending.service.inspectEnvironment({}, { signal: inFlight.signal })
  inFlight.abort()
  release({ checks: [] })
  await assert.rejects(observation, { name: 'AbortError' })
})

test('host inspection honors env.json PATH/JAVA_HOME and rejects bad CLI/old Java without downloads', { skip: process.platform === 'win32' }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-env-'))
  const original = { ...process.env }
  try {
    const bin = path.join(root, 'bin'), jdk = path.join(root, 'jdk', 'bin')
    fs.mkdirSync(bin, { recursive: true }); fs.mkdirSync(jdk, { recursive: true })
    const executable = (file, text) => { fs.writeFileSync(file, '#!/bin/sh\n' + text + '\n', { mode: 0o755 }) }
    executable(path.join(bin, 'craft-anything-cli'), 'exit 1')
    executable(path.join(bin, 'codex'), 'echo codex-cli 0.99.0')
    executable(path.join(bin, 'java'), 'echo \'openjdk version "17.0.1"\' >&2')
    executable(path.join(jdk, 'java'), 'echo \'openjdk version "21.0.4"\' >&2')
    executable(path.join(bin, 'gdb'), 'echo "GNU gdb (GDB) 15.1"')
    executable(path.join(bin, 'chromium'), 'echo "Chromium 130.0.0"')
    fs.writeFileSync(path.join(root, 'env.json'), JSON.stringify({ PATH: bin, JAVA_HOME: path.dirname(jdk), CRAFT_ANYTHING_CLI: path.join(bin, 'craft-anything-cli') }))
    const before = fs.readFileSync(path.join(root, 'env.json'), 'utf8')
    const report = await inspectEnvironment({ installDir: root }, { full: true })
    const byId = Object.fromEntries(report.checks.map((item) => [item.id, item]))
    assert.equal(byId.cli.state, 'missing')
    for (const id of ['coding-agent', 'java', 'gdb', 'chromium']) assert.equal(byId[id].state, 'ok', byId[id].detail)
    assert.match(byId.java.detail, /21.0.4/)
    assert.equal(byId.ghidra.auto, false)
    assert.equal(fs.readFileSync(path.join(root, 'env.json'), 'utf8'), before)
    assert.ok(report.checks.every((item) => typeof item.label === 'string' && typeof item.detail === 'string'))
  } finally {
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'craft-env-')))
    fs.rmSync(root, { recursive: true, force: true })
  }
})
