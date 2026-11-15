// Native dependency setup: inspection is read-only; only a confirmed plan starts work.
import { inspectEnvironment, startDeployment, deploymentSnapshot } from './environment.js'

const bind = (key) => ({ $: `data.${key}` })
const scopeKey = (scope) => scope?.sessionId || '__features__'
const stateName = { ok: '可复用', missing: '缺少', unknown: '待核对', manual: '需手动配置' }

export function setupView() {
  return { v: 1, type: 'stack', title: 'Craft 环境部署', children: [
    { type: 'text', text: bind('setupNotice') },
    { type: 'text', text: bind('environmentChecks') },
    { type: 'actions', items: [
      { label: '重新检测', action: 'inspect-env', icon: 'search' },
      { label: '一键部署', action: 'prepare-env', icon: 'download' },
    ] },
    { type: 'text', text: bind('deploymentPlan') },
    { type: 'confirm', id: 'confirm-env', confirmLabel: '确认部署', cancelLabel: '暂不部署' },
    { type: 'text', text: bind('deploymentStatus') },
    { type: 'text', text: bind('deploymentLog') },
    { type: 'text', text: '安装只补齐确认清单中的缺项。已有可用环境会跳过；登录与模型配置仍由你完成。' },
  ] }
}

export function registerSetup(ctx, config = {}, dependencies = {}) {
  const host = { inspectEnvironment, startDeployment, deploymentSnapshot, ...dependencies }
  const lifetime = new AbortController()
  const listeners = new Set()
  const plans = new Map()
  let active = true, report = null, inFlight = null
  let setupNotice = '正在检查本机依赖…'
  const snapshot = () => host.deploymentSnapshot(config)
  const fields = (scope) => {
    const plan = plans.get(scopeKey(scope))
    const job = snapshot()
    return {
      setupNotice,
      environmentChecks: report?.checks?.map((check) => `${check.label}：${stateName[check.state] || '待核对'}\n${String(check.detail || '').slice(0, 300)}`).join('\n\n') || '尚未完成检测',
      deploymentPlan: plan ? `是否部署以下缺失依赖？\n${plan.labels.join('、')}\n可能下载较大文件并安装系统软件包。确认后在本机后台执行。` : '点击「一键部署」生成缺失依赖清单，再确认是否部署。',
      deploymentStatus: job ? `部署${{ running: '进行中', done: '已完成', error: '失败', failed: '失败' }[job.status] || job.status}：${job.detail || ''}${job.error ? `\n${job.error}` : ''}` : '尚未启动部署',
      deploymentLog: Array.isArray(job?.log) ? job.log.slice(-12).join('\n').slice(-5000) : String(job?.log || '').slice(-5000),
    }
  }
  const publish = () => {
    if (!active) return
    for (const listener of listeners) { try { listener() } catch { /* disconnected */ } }
    dependencies.onChange?.({ notice: setupNotice, needsSetup: report?.checks?.some((check) => check.state !== 'ok') === true })
  }
  const inspect = (full = false) => {
    if (inFlight) return inFlight
    const controller = new AbortController()
    const abort = () => controller.abort()
    lifetime.signal.addEventListener('abort', abort, { once: true })
    const deadline = setTimeout(abort, 50_000)
    deadline.unref?.()
    if (lifetime.signal.aborted) controller.abort()
    const operation = Promise.resolve().then(() => host.inspectEnvironment(config, { full, signal: controller.signal })).then((value) => {
      if (!active) return value
      report = value
      const missing = value.checks.filter((check) => check.state !== 'ok')
      setupNotice = missing.length ? `发现 ${missing.length} 项依赖需要处理，是否部署？可先查看下方检测结果。` : '已检测到可复用的环境，无需部署。'
      publish()
      return value
    }).catch((error) => {
      if (active) { setupNotice = '依赖检测未完成，可点「重新检测」重试。'; publish() }
      throw error
    }).finally(() => {
      clearTimeout(deadline)
      lifetime.signal.removeEventListener('abort', abort)
      if (inFlight === operation) inFlight = null
    })
    inFlight = operation
    return operation
  }
  const pending = (label, work) => ({
    pending: { label, timeoutMs: 60_000 },
    result: async (signal) => {
      if (!active || signal?.aborted) return { toast: '操作已取消' }
      try { return await work(signal) }
      catch { return { toast: '依赖检测未完成，请重新检测' } }
    },
  })
  let lastJob = null
  const timer = setInterval(() => {
    const job = snapshot()
    if (!job) return
    const revision = JSON.stringify(job)
    if (revision === lastJob) return
    lastJob = revision
    publish()
    if (job.status !== 'running') void inspect(true).catch(() => {})
  }, 2000)
  timer.unref?.()
  ctx.dshGo.panel('craft-setup', {
    view: setupView,
    data: (scope, emit) => {
      const push = () => emit(fields(scope))
      listeners.add(push); push()
      return () => listeners.delete(push)
    },
    actions: {
      'inspect-env': (scope) => pending('正在检测环境依赖', async (signal) => {
        plans.delete(scopeKey(scope))
        if (inFlight) await inFlight
        await inspect(true)
        return signal?.aborted ? { toast: '操作已取消' } : { patch: fields(scope), toast: '环境检测已完成' }
      }),
      'prepare-env': (scope) => pending('正在生成部署清单', async (signal) => {
        if (snapshot()?.status === 'running') return { toast: '部署正在进行，请查看进度' }
        plans.delete(scopeKey(scope))
        if (inFlight) await inFlight
        const value = await inspect(true)
        if (!active || signal?.aborted) return { toast: '操作已取消' }
        const checks = value.checks.filter((check) => check.auto && check.state === 'missing')
        if (!checks.length) return { toast: '没有可自动部署的缺项', patch: fields(scope) }
        plans.set(scopeKey(scope), { ids: checks.map((check) => check.id), labels: checks.map((check) => check.label), expires: Date.now() + 5 * 60_000 })
        publish()
        return { patch: fields(scope), toast: '请核对清单并确认部署' }
      }),
      'confirm-env': (scope, event) => {
        const key = scopeKey(scope)
        const plan = plans.get(key)
        plans.delete(key)
        if (event?.value?.confirmed !== true) { publish(); return { toast: '已暂不部署', patch: fields(scope) } }
        if (!plan || plan.expires < Date.now()) { publish(); return { toast: '请先重新生成部署清单', patch: fields(scope) } }
        try {
          host.startDeployment(config, { ids: plan.ids })
          publish()
          return { toast: '已启动部署，可在此查看进度', patch: fields(scope) }
        } catch { publish(); return { toast: '已有部署任务或清单无效，请刷新', patch: fields(scope) } }
      },
    },
  })
  // Package installation activates this adapter. Never install from npm lifecycle hooks.
  void inspect().catch(() => {})
  return () => { active = false; lifetime.abort(); clearInterval(timer); plans.clear(); listeners.clear() }
}
