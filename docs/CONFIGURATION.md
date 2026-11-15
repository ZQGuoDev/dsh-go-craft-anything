# 配置、目录与架构

## 组件关系

```text
dsh-go App 原生界面
  └─ package.json 的 dshGo 声明 + lib/mobile.js
       └─ lib/index.js → host/index.js
            ├─ 五个 craft_* 宿主工具
            └─ 本地 Craft CLI
DSH MCP 客户端
  └─ scripts/mcp-bridge.cjs
       └─ craft-anything-cli mcp
            └─ 按需调用 Ghidra、浏览器、编码智能体等
```

App 渲染声明式 JSON 面板；插件代码在宿主引擎中执行。原生面板直接复用 host 函数，不需要读取 HTTP bearer token。

保留的 `client.js` 是上游网页端实现，本手机版包没有在 package.dsh 中注册网页客户端入口。本项目的主要交互由 `dshGo` 提供。

## 目录

| 位置 | 用途 |
| --- | --- |
| `${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything` | 推荐的源码 / 本地链接安装目录 |
| `$DSH_HOME/profiles/web` | 手机本机引擎使用的 profile，由 dsh 管理 |
| `$HOME/.dsh/plugins-data/craft-anything` | 默认 CLI、桥与插件运行数据根 |
| `数据根/bin/craft-anything-cli` | 稳定 CLI 副本，推荐作为运行入口 |
| `数据根/版本号/craft-anything-cli` | 按版本保存的 CLI |
| `数据根/downloads` | 下载缓存 |
| `数据根/mode.json` | 全局模式 |
| `数据根/bridge.json` | MCP 开关和工具白名单 |
| `数据根/env.json` | 子进程的额外环境变量，可能包含敏感值 |
| `数据根/http.token` | 本地 HTTP 管理令牌，不应提交或分享 |
| `数据根/mcp.state.json` | CLI PID、模式、工具数、切换状态等 |
| `数据根/update.state.json`、`restart.*` | 上游网页更新 / 重启运行记录 |
| `$HOME/.config/craft-anything` | 本机 Linux 的 CLI 配置和引擎缓存，实际位置受 CLI 平台规则影响 |
| 自己指定的项目目录 | rebuild 产物、证据、报告和日志 |

`DSH_HOME` 与插件默认数据根不是同一个配置项。默认数据根来自 HOME / USERPROFILE 下的 `.dsh`，不要假设它随独立 DSH_HOME 一起迁移。

## Host 配置项

`cordis.patch.yml` 的 host 项支持：

| 配置 | 意义 |
| --- | --- |
| `cliPath` | host 显式 CLI 路径 |
| `installDir` | host 的安装 / 数据根 |
| `projectDir` | `craft_cli` 默认工作目录 |
| `projectsRoot` | 状态展示中的项目根，不会自动改所有命令的输出目录 |
| `allowNonLoopback` | 允许扩展 HTTP 管理接口的主机边界，默认关闭 |
| `trustedHosts` | 与非本机访问配置配合使用的可信 Host 列表 |

本地 CLI 发现顺序：显式配置 / 环境覆盖 → 稳定 bin → 版本子目录，失效路径会尝试回退。host 与 MCP launcher 的发现细节并不完全一致；自定义路径应分别核对。

不要把 Windows 示例路径照搬到手机。优先保留默认根，通过命令参数明确项目路径。

## 环境变量

| 变量 | 作用及注意事项 |
| --- | --- |
| `CRAFT_ANYTHING_CLI` | 自定义 CLI；需由实际启动引擎的环境继承 |
| `CRAFT_ANYTHING_ROOT` | host / MCP 的数据根覆盖；直接安装脚本仍需 `--root` |
| `CRAFT_ANYTHING_MCP_ARGS` | 添加 MCP CLI 参数，按空白拆分；不用于放带复杂空格的路径 |
| `CRAFT_ANYTHING_DRAIN_MS` | 切模式时等待在途调用的上限，默认 20000 ms，代码限制约 1000–120000 ms |
| `CRAFT_ANYTHING_GITHUB_MIRRORS` | 下载镜像候选，逗号分隔 |
| `CRAFT_ANYTHING_NPM_REGISTRY` | 上游依赖安装器 npm registry 覆盖 |
| `GHIDRA_INSTALL_DIR` / `JAVA_HOME` / `PATH` | 引擎与 Java 的子进程查找环境 |
| `HTTP_PROXY` / `HTTPS_PROXY` | 下载与部分子进程的代理 |

不要通过 `CRAFT_ANYTHING_MCP_ARGS` 强塞 `--deep` / `--clean-room` 与模式文件竞争；使用面板或 `craft_mode`。

`env.json` 必须是 JSON 对象，其值用于子进程环境。以下是无密钥结构示例，合并到原有文件，不要覆盖已有配置：

```json
{
  "GHIDRA_INSTALL_DIR": "/opt/ghidra",
  "JAVA_HOME": "/usr/lib/jvm/java-25-openjdk-arm64"
}
```

PATH 在 JSON 中是普通字符串，`$PATH`、`~`、`$JAVA_HOME` 不会自动按 shell 规则展开。确需设置时填写真实完整路径；错误 PATH 会遮蔽 git、node 等命令。

host 与 MCP 加载环境的时点不同；编辑后重启 App 引擎，再核对真实版本、引擎和工具状态。终端 export 也不会改变已运行进程。

## 桥配置

```json
{"enabled":true,"allow":["core_*"]}
```

空 allow 允许当前 CLI 可提供的全部工具。enabled=false 隐藏 / 阻止 MCP 工具调用，但不是整个宿主工具系统的总开关。

CLI 默认只暴露 Essentials，其他工具集通过 `list_toolsets` / `enable_toolset` 加载。先加载 CLI 工具，再由白名单筛选；放开白名单不能代替加载工具集。

## HTTP 管理接口

上游保留 status、mode、env、bridge、update、restart 等路由，仅在宿主提供 webServer 时挂载。默认有 Host / Origin 边界、DSH 连接准入与管理 token。不要将这些路由直接暴露到公网。

手机原生 UI 不提供桌面网页更新 / 自动重启按钮；上游更新源仍是 Fanqi89，并按桌面包名定位 profile。该链路不作为本移动分支的升级方式。

更新器还保留了代理场景下可能关闭 Node 子进程 TLS 证书验证的兼容代码。本发布没有宣称该链路的 TLS 全程严格验证；参见 [安全说明](../SECURITY.md)。

## 源码结构

- `lib/index.js`：手机包入口，调用 host 并注册 dshGo。
- `lib/mobile.js`：原生面板、状态订阅、点按处理、取消与生命周期。
- `manifest-mobile.json`：独立原生清单，与 package.json 的 dshGo 内容保持一致。
- `host/index.js`：工具、状态、CLI 进程与保留的 HTTP 路由。
- `host/update.mjs`：保留的桌面上游更新实现，不用于升级手机分支。
- `scripts/install-cli.mjs`：Linux / macOS 安装器。
- `scripts/mcp-bridge.cjs`：MCP 代理、白名单、模式热切换与 schema 兼容。
- `client.js`：保留的上游网页实现。
- `docs/upstream`：上游原始资料存档，不作为手机安装说明。
