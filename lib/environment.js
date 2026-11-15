import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { environmentBackend } from '../host/index.js'

const IDS = Object.freeze(['cli', 'coding-agent', 'java', 'ghidra', 'gdb', 'chromium'])
const jobs = new Map()
const bounded = (value, max = 800) => String(value ?? '').slice(0, max)
const cancelled = (signal) => {
  if (signal?.aborted) throw Object.assign(new Error('环境检测已取消'), { name: 'AbortError' })
}

/** Injectable orchestration; production and host HTTP share this same per-root job registry. */
export function createEnvironmentService(backend, registry = jobs) {
  const rootOf = (config) => {
    let root = path.resolve(backend.root(config || {}))
    const tail = []
    while (!fs.existsSync(root)) {
      const parent = path.dirname(root)
      if (parent === root) break
      tail.unshift(path.basename(root))
      root = parent
    }
    try { root = fs.realpathSync(root) } catch { /* unresolved parent */ }
    const normalized = path.join(root, ...tail)
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized
  }
  const snapshot = (job) => job ? {
    id: job.id, status: job.status, ids: [...job.ids], startedAt: job.startedAt,
    updatedAt: job.updatedAt, detail: bounded(job.detail, 400), error: job.error ? bounded(job.error) : null,
    log: job.log.slice(-30).map((line) => bounded(line, 500)).join('\n'),
  } : null
  const log = (job, text) => {
    job.log.push(...bounded(text, 4000).split(/\r?\n/).filter(Boolean).map((line) => bounded(line, 500)))
    if (job.log.length > 80) job.log.splice(0, job.log.length - 80)
    job.updatedAt = new Date().toISOString()
  }
  const inspectEnvironment = async (config = {}, options = {}) => {
    cancelled(options.signal)
    const report = await backend.inspect(config || {}, options)
    cancelled(options.signal)
    return report
  }
  const deploymentSnapshot = (config = {}) => snapshot(registry.get(rootOf(config)))
  const startDeployment = (config = {}, { ids } = {}) => {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string' || !IDS.includes(id))) {
      throw new Error('部署需要明确选择 cli、coding-agent、java、ghidra、gdb 或 chromium')
    }
    const root = rootOf(config)
    if (registry.get(root)?.status === 'running') throw new Error('本机环境部署正在进行，请等待完成')
    // Freeze the accepted plan before yielding: never expand it from a later detection result.
    const accepted = [...new Set(ids)]
    const job = { id: randomUUID(), ids: accepted, status: 'running', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), detail: '正在重新检测已选环境', error: null, log: [] }
    registry.set(root, job)
    Promise.resolve().then(async () => {
      for (const id of accepted) {
        const report = await inspectEnvironment(config, { full: true })
        const check = report.checks.find((item) => item.id === id)
        if (!check) throw new Error(`未返回环境检测结果：${id}`)
        if (check.state === 'ok') { log(job, `${id}: 已存在可用环境，跳过安装`); continue }
        if (!check.auto || !['missing'].includes(check.state)) throw new Error(`${check.label}: ${check.detail || '需要手动配置'}`)
        job.detail = `正在安装 ${check.label}`
        log(job, job.detail)
        await backend.install(config, id, job)
        const verified = (await inspectEnvironment(config, { full: true })).checks.find((item) => item.id === id)
        if (verified?.state !== 'ok') throw new Error(`${check.label} 安装后未通过验证：${verified?.detail || '没有可用检测结果'}`)
        log(job, `${id}: 安装后验证通过`)
      }
      job.status = 'done'
      job.detail = '已选环境处理完成'
    }).catch((error) => {
      job.status = 'failed'
      job.error = bounded(error?.message || error)
      job.detail = '环境部署失败'
      log(job, job.error)
    }).finally(() => { job.updatedAt = new Date().toISOString() })
    return snapshot(job)
  }
  return { inspectEnvironment, startDeployment, deploymentSnapshot }
}

const service = createEnvironmentService(environmentBackend)
export const inspectEnvironment = service.inspectEnvironment
export const startDeployment = service.startDeployment
export const deploymentSnapshot = service.deploymentSnapshot
