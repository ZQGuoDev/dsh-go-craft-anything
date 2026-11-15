// Native dsh-go adapter. Host implementation: Fanqi89/dsh-craft-anything (MIT).
import { statusReport, readMode, setMode, readBridge, writeBridge, bridgeReport } from '../host/index.js'
import { registerSetup } from './setup.js'

const POLL_MS = 60_000
const DEADLINE_MS = 55_000
const modeName = (mode) => mode === 'deep' ? '深度' : '净室'
const bind = (key) => ({ $: `data.${key}` })

export function statusView() {
  return { v: 1, type: 'stack', title: 'Craft 本机状态', children: [
    { type: 'callout', tone: 'info', text: '模式与桥设置对本主机所有会话生效。默认净室；切换仅在点按后执行。' },
    { type: 'text', text: bind('notice') },
    { type: 'text', text: bind('environmentNotice') },
    { type: 'actions', items: [{ label: '环境依赖 / 部署', action: 'open-setup', icon: 'download' }] },
    { type: 'keyValue', items: [
      ['CLI', bind('installed')], ['路径', bind('cliPath')], ['版本', bind('version')],
      ['架构', bind('architecture')], ['全局模式', bind('mode')], ['桥运行模式', bind('runningMode')],
      ['全局桥', bind('bridge')], ['工具白名单', bind('allow')],
      ['桥可见工具', bind('visibleTools')], ['CLI 能力工具', bind('capabilityTools')],
      ['引擎检测', bind('engines')], ['编码智能体', bind('codingAgent')],
      ['Ghidra', bind('ghidra')], ['更新时间', bind('updatedAt')],
    ] },
    { type: 'actions', items: [
      { label: '刷新状态', action: 'refresh', icon: 'refresh' },
      { label: '完整检测', action: 'full-status', icon: 'search' },
    ] },
    { type: 'text', text: '全局模式：净室保留默认外部观察；深度启用内部分析。' },
    { type: 'actions', items: [
      { label: '净室', action: 'clean', icon: 'check' },
      { label: '深度', action: 'deep', icon: 'search' },
    ] },
    { type: 'actions', items: [
      { label: '开桥', action: 'bridge-on', icon: 'power' },
      { label: '关桥', action: 'bridge-off', icon: 'stop' },
      { label: '仅核心', action: 'core-only', icon: 'tool' },
      { label: '全部工具', action: 'all-tools', icon: 'list' },
    ] },
    { type: 'text', text: '仅核心 / 全部工具修改全局白名单；不自动打开已关闭的桥。命令只复制，由你决定何时执行。' },
    { type: 'actions', items: [{ label: '复制常用命令', action: 'copy-commands', icon: 'copy' }] },
  ] }
}

export function toMobileData(report, bridge, config = {}) {
  const installed = report?.installed === true
  const caps = report?.capabilities
  const measured = bridge?.tools?.visible
  const settings = bridge?.bridge || readBridge(config)
  const hasVisible = Number.isFinite(measured) && bridge?.server
  return {
    installed: installed ? '已安装' : '未安装',
    cliPath: installed ? (report.cliPath || '未报告') : '未找到 craft-anything-cli',
    version: installed ? (report.version || '尚未检测') : '未安装',
    architecture: `${process.platform} / ${process.arch}`,
    mode: `${modeName(report?.mode || readMode(config))}（全局）`,
    runningMode: bridge?.server ? `${modeName(bridge.server.mode)}${bridge.switching ? ' · 切换中' : ''}` : '桥尚未运行',
    bridge: settings.enabled ? '已开启（全局）' : '已关闭（全局）',
    allow: settings.allow.length ? settings.allow.join('、') : '全部工具',
    visibleTools: hasVisible ? String(measured) : '尚未报告',
    capabilityTools: installed && Number.isFinite(caps?.tools) ? String(caps.tools) : '尚未检测',
    engines: Array.isArray(caps?.enginesFound) ? (caps.enginesFound.join('、') || '未检测到可用引擎') : '尚未检测',
    codingAgent: report?.prerequisites?.codingAgent || '未检测到',
    ghidra: report?.prerequisites?.ghidraDetected ? 'CLI 已检测到' : '未检测到',
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    notice: installed ? '本地状态；可进入环境部署检查依赖。' : 'CLI 未安装，请打开「环境依赖 / 部署」确认安装。',
  }
}

// Bounded work also observes plugin disposal and App cancellation. A late host
// resolution is consumed, never emitted; newer hosts pass these signals to probes.
export function bounded(work, signal, timeoutMs = DEADLINE_MS) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    let timer
    let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      error ? reject(error) : resolve(value)
    }
    const abort = () => {
      controller.abort()
      finish(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
    }
    if (signal?.aborted) return abort()
    signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => {
      controller.abort()
      finish(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))
    }, timeoutMs)
    Promise.resolve().then(() => {
      if (controller.signal.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
      return work(controller.signal)
    }).then((value) => finish(null, value), (error) => finish(error))
  })
}

export function registerMobile(ctx, config = {}, dependencies = {}) {
  // Comment-only YAML config blocks arrive as null, not undefined.
  config = config || {}
  const host = { statusReport, readMode, setMode, readBridge, writeBridge, bridgeReport, ...dependencies }
  ctx.inject(['dshGo'], (ctx) => {
    const listeners = new Set()
    const watcherStops = new Set()
    const lifetime = new AbortController()
    let report = null
    let inFlight = null
    let probeController = null
    let active = true
    let modeBusy = false
    const localData = () => toMobileData({ ...report, mode: host.readMode(config) }, host.bridgeReport(config), config)
    let data = { ...localData(), notice: '正在读取本机状态…', environmentNotice: '正在检查环境依赖…', needsSetup: false }
    const publish = () => {
      if (!active) return
      for (const listener of listeners) {
        try { listener(data) } catch { /* a disconnected App is not a host error */ }
      }
    }
    const updateLocal = () => { data = { ...data, ...localData() }; publish(); return data }
    const refresh = (full = false, signal = lifetime.signal) => {
      if (inFlight) return inFlight
      const controller = new AbortController()
      probeController = controller
      const abort = () => controller.abort()
      const sources = [...new Set([signal, lifetime.signal].filter(Boolean))]
      for (const source of sources) {
        if (source.aborted) controller.abort()
        else source.addEventListener('abort', abort, { once: true })
      }
      const operation = bounded((signal) => host.statusReport(config, { full, signal, timeoutMs: 24_000 }), controller.signal)
        .then((value) => { if (active) { report = value; updateLocal() }; return data })
        .finally(() => {
          for (const source of sources) source.removeEventListener('abort', abort)
          if (inFlight === operation) { inFlight = null; probeController = null }
        })
      inFlight = operation
      return operation
    }
    const watch = (emit, strip = false) => {
      let disposed = false
      const push = (value) => {
        if (disposed) return
        if (strip) emit({ text: value.needsSetup ? 'Craft 依赖待处理 · 点此查看' : `${modeName(host.readMode(config))} · CLI ${value.installed}`, icon: 'tool' })
        else emit(value)
      }
      listeners.add(push)
      push(data)
      // Cheap disk-only polling, then a shared host refresh using its probe cache.
      const tick = () => {
        if (disposed || !active) return
        updateLocal()
        void refresh(false).catch((error) => {
          if (disposed || !active || error?.name === 'AbortError') return
          data = { ...data, notice: '检测未完成；可稍后刷新或查看本地 CLI。' }; publish()
        })
      }
      tick()
      const timer = setInterval(tick, POLL_MS)
      timer.unref?.()
      const stop = () => {
        disposed = true; listeners.delete(push); clearInterval(timer); watcherStops.delete(stop)
        if (listeners.size === 0) probeController?.abort()
      }
      watcherStops.add(stop)
      return stop
    }
    const pending = (label, work) => ({
      pending: { label, timeoutMs: 60_000 },
      result: async (signal) => {
        if (!active || signal?.aborted) return { toast: '操作已取消' }
        try {
          return await bounded(work, signal)
        } catch (error) {
          return { toast: error?.name === 'AbortError' ? '操作已取消' : '检测未完成；请刷新状态核对' }
        }
      },
    })
    const changeMode = (wanted) => {
      if (modeBusy) return { toast: '模式正在切换，请稍候' }
      return pending(`正在切换${modeName(wanted)}模式`, async (signal) => {
        if (modeBusy) return { toast: '模式正在切换，请稍候' }
        modeBusy = true
        try {
          const result = await host.setMode(config, wanted, { signal, timeoutMs: 52_000 })
          if (signal.aborted || !active) return { toast: '操作已取消' }
          if (report) report = { ...report, mode: host.readMode(config) }
          const patch = updateLocal()
          return { toast: `${modeName(host.readMode(config))}模式${result?.applied === false ? '已保存，桥切换中' : '已生效'}（全局）`, patch }
        } finally { modeBusy = false }
      })
    }
    const changeBridge = (patch) => {
      try {
        host.writeBridge(config, patch)
        return { toast: '全局桥设置已保存', patch: updateLocal() }
      } catch { return { toast: '桥设置保存失败，请检查本机目录' } }
    }
    ctx.dshGo.on('toggle-mode', () => changeMode(host.readMode(config) === 'deep' ? 'clean' : 'deep'))
    ctx.dshGo.on('open-craft', () => ({ open: 'panel:craft-status' }))
    ctx.dshGo.strip('craft-strip', (_scope, emit) => watch(emit, true))
    ctx.dshGo.panel('craft-status', {
      view: statusView,
      data: (_scope, emit) => watch(emit),
      actions: {
        'open-setup': () => ({ open: 'panel:craft-setup' }),
        refresh: () => pending('正在刷新本地状态', async (signal) => ({ patch: await refresh(false, signal), toast: '本地状态已刷新' })),
        'full-status': () => pending('正在完整检测本机能力', async (signal) => {
          // If a cached refresh is running, finish it before the explicit full probe.
          if (inFlight) await inFlight
          return { patch: await refresh(true, signal), toast: '完整检测已完成' }
        }),
        clean: () => changeMode('clean'),
        deep: () => changeMode('deep'),
        'bridge-on': () => changeBridge({ enabled: true }),
        'bridge-off': () => changeBridge({ enabled: false }),
        'core-only': () => changeBridge({ allow: ['core_*'] }),
        'all-tools': () => changeBridge({ allow: [] }),
        'copy-commands': () => ({ copy: 'craft_install\ncraft_status {"refresh":true}\ncraft_cli {"args":["doctor"]}\ncraft_cli {"args":["commands"]}\ncraft_bridge\ncraft_mode', toast: '已复制命令；粘贴后由你发送' }),
      },
    })
    const stopSetup = registerSetup(ctx, config, { ...dependencies, onChange: ({ notice, needsSetup }) => {
      data = { ...data, environmentNotice: notice, needsSetup }; publish()
    } })
    const dispose = () => { active = false; lifetime.abort(); stopSetup(); for (const stop of watcherStops) stop(); listeners.clear() }
    ctx.on?.('dispose', dispose)
    return dispose
  })
}
