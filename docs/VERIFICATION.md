# 验证记录与范围

日期：2026-11-15。以下区分本次发布副本检查与本机先前部署记录，不把“程序路径存在”当成所有功能均可用。

## 本次发布副本

环境：Android 手机上的 Ubuntu 24.04 proot / Linux ARM64，Node.js 24.22.1。

| 检查 | 结果 |
| --- | --- |
| 原生适配 Node 测试 | 11 / 11 通过 |
| dsh-go 检查器 `--load` | 通过；2 胶囊、1 状态条、1 面板、1 加号工具 |
| 宿主注册 | 5 个 craft_* 工具加载成功 |
| 视图检查 | session.tab、features、chat.panel × zh-CN / en-US，共 6 组通过 |
| MCP 桥回归 | 41 项断言通过 |
| 布尔子 schema 回归 | 7 项断言通过 |
| CLI 安装器离线回归 | 12 / 12 通过，使用本地假 release / 临时根，不安装到真实运行根 |

安装器测试第一轮为 11 / 12：上游测试要求出现“cross-platform install”文案，假定运行主机不是 Linux。本发布副本按运行平台选择预期输出，保留字节一致、SHA256、权限、稳定副本和下载请求断言；重跑 12 / 12 通过。生产安装器未修改。

静态检查覆盖 JavaScript 语法、JSON 解析、两个清单的版本 / id、独立 dshGo 清单一致性及手机文档本地链接。最终机器结果保存在 [release-check-results.json](release-check-results.json)。

发布副本统一了 `dsh.plugin.json` 与 package.json 的 0.6.1-mobile.1 版本；保留上游 MIT 声明。旧 PowerShell 发布脚本默认禁用；未运行发布、更新或引擎重启操作。

## 本机先前部署记录

以下结论来自本机已有适配与依赖验证文档。本次整理重新执行了 CLI 版本命令，确认 `craft-anything-cli 0.6.1`；没有为了文档打包再次运行耗时重建 / 反编译。

| 项目 | 已有记录 |
| --- | --- |
| CLI | 官方 0.6.1 Linux aarch64，在 proot 中执行成功 |
| MCP | 真实 initialize / tools/list 成功；初始 Essentials 工具列表可读 |
| 编码 | 配置 DSH Local 后生成 `CRAFT_AGENT_OK` 文本，最小 HTML / CSS rebuild 成功 |
| Claude Code | 安装过 2.1.325，未登录，未作为默认可用后端 |
| Ghidra | 12.2 + Java25 + 自编译 ARM64 native，headless 分析和函数反编译成功 |
| Craft + Ghidra | native-function-pseudocode 深度分析集成记录成功 |
| CLI doctor | 既有文档记录 healthy=true、MCP 自检通过 |

工具总数随版本变化；先前记录的 17 工具集 / 323 能力只是当次 CLI 探测，不作为所有安装的固定承诺。默认可见数也受到模式、工具集和白名单影响。

## 未覆盖

- 面向真实 web profile 的远程标签再次安装尚未执行，以免改动本机正在运行的插件；发布过程单独核对 GitHub 仓库、固定标签、Release 资产与隔离目录包安装。
- 本次没有重新逐项点按 App 实机 UI；检查器可渲染不等于所有设备上的视觉检查。
- 所有 Android 型号、其他 App / Node / DSH 版本、32 位 CPU、其他 Linux发行版。
- Chromium / ADB / JADX / 调试器的完整手机运行链路。
- 桌面网页交互、保留的更新 / 自动重启链路与 Windows PowerShell 语法 / 实机执行。
- 保证所有 CLI 能力已拥有外部依赖或每个长任务均可完成。

源码发布包不包含私有验证项目、原始运行日志、诊断、模型登录、CLI 和 Ghidra 二进制。使用者需要按自己的环境独立安装和验收。
