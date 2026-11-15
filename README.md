# dsh-go Craft Anything

给 **dsh-go 手机 App** 使用的 Craft Anything 原生插件：在聊天输入框上方打开 Craft 面板，查看本机 CLI、引擎和 MCP 状态，切换净室 / 深度模式，控制工具白名单，并让 AI 调用本地 Craft CLI。

本发布候选版本：**0.6.1-mobile.1**。npm 包名与卸载名：**local-craft-anything**。

基于 [Fanqi89/dsh-craft-anything](https://github.com/Fanqi89/dsh-craft-anything) 0.6.1（MIT）适配；参考镜像为 [hbsyzstq/dsh-craft-anything](https://github.com/hbsyzstq/dsh-craft-anything)。分析引擎来自 [storytold/craft-anything](https://github.com/storytold/craft-anything)，需要另外安装。本项目是社区手机适配，与上述项目没有官方隶属关系。

> 面向 Android 上 dsh-go 管理的 Ubuntu / proot 本机引擎。本仓库是插件源码，不是 Android APK；不会附带你的模型密钥、CLI、Ghidra、浏览器或预先配置好的编码智能体。

## 功能

| 入口 / 能力 | 作用 |
| --- | --- |
| 「切换模式」胶囊 | 在净室和深度之间切换本主机的全局模式 |
| 「Craft 面板」胶囊 | 打开原生本机状态面板 |
| 输入框上方状态条 | 显示当前模式与 CLI 安装状态，点按进入面板 |
| 加号工具中的 Craft | 支持该插槽的 App 上提供快捷入口 |
| 对话详情 / 全部功能 | 打开同一个 Craft 状态面板 |
| 刷新状态 / 完整检测 | 普通刷新复用缓存；完整检测重跑版本与能力探针 |
| 开桥 / 关桥 | 控制 `mcp__craft__*` 工具是否对 AI 可见 |
| 仅核心 / 全部工具 | 设置 MCP 工具白名单；不改变桥开关 |
| 复制常用命令 | 复制工具调用提示，由用户粘贴到对话再发送 |
| 五个宿主工具 | `craft_status`、`craft_install`、`craft_cli`、`craft_mode`、`craft_bridge` |
| MCP 工具 | 由本地 CLI 动态提供，以 `mcp__craft__*` 命名 |

面板显示 CLI 路径、版本、CPU 架构、配置模式、桥运行模式、桥开关、白名单、可见工具数、CLI 能力数、引擎检测、编码智能体和 Ghidra 检测结果。未知值显示「尚未报告 / 尚未检测」，不使用固定宣传数字替代检测结果。

## 安装前准备

- 使用支持 `dshGo` 原生插件桥的 dsh-go App，并启动本机引擎。
- 在 **dsh-go 的 Ubuntu 环境**运行下文终端命令，不是在 Android 系统 sh 或普通 Termux 中执行。
- 可运行 `dsh`、Node.js、Git、curl、tar；本机验证环境的 Node 为 24.22.1。
- 需要访问 GitHub / 下载源；安装依赖可能还需要 Ubuntu 软件源。
- 包内 `engines.dsh >=0.2.1-rc.2` 是继承的宿主 API 下限，不能代替 dsh-go App 原生插槽兼容性要求。其他 App 版本、其他 CPU 和远程主机尚未完成全面验证。

先按下面方式安装插件，再安装 Craft CLI；最后根据用途增加可选引擎。详细说明见 [安装指南](docs/INSTALL.md)。

## 快速安装

本移动分支的发布仓库为 [qingyunqingtong/dsh-go-craft-anything](https://github.com/qingyunqingtong/dsh-go-craft-anything)。以下命令面向 dsh-go 的 Ubuntu 本机引擎。

### 方式一：克隆到保留目录（推荐）

```bash
PLUGIN_DIR="${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything"
mkdir -p "$(dirname "$PLUGIN_DIR")"
git clone https://github.com/qingyunqingtong/dsh-go-craft-anything.git "$PLUGIN_DIR"
dsh plugin --profile web add "$PLUGIN_DIR"
```

如果目标目录已经存在，先参阅 [更新与卸载](docs/INSTALL.md#更新插件)，不要覆盖正在使用的安装。

若代码入口没有立即出现，在 App「引擎」页重启引擎一次。回到聊天页，查看「Craft 面板」胶囊；也可在「全部功能」或对话详情的插件页查找「Craft 本机状态」。

### 方式二：安装固定 GitHub 标签

仓库和标签实际发布后，可以使用：

```bash
dsh plugin --profile web add github:qingyunqingtong/dsh-go-craft-anything#v0.6.1-mobile.1
```

此命令使用 dsh 转发到 pnpm 的 GitHub 包安装能力。本地路径安装已有实机部署记录；发布端还会核对固定标签及包内容。手机使用 `--profile web`。

### 方式三：Release 源码压缩包

解压后，将含本仓库 `package.json` 的目录复制到 `${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything`，然后执行上面的本地 `add` 命令。不要把整个源码 zip 当作 APK 安装，也不要把 zip 文件名当作本地插件目录。

## 安装 Craft CLI

在 dsh-go 对话里发送：

```text
请调用 craft_install，安装 v0.6.1 的官方 Craft CLI；然后调用 craft_status，refresh=true，并执行 craft_cli 的 doctor 检查。
```

对应工具参数示例：

```text
craft_install {"version":"v0.6.1"}
craft_status {"refresh":true}
craft_cli {"args":["doctor"]}
```

上面是 **AI 工具调用示例**，不是 Ubuntu shell 命令。如果工具尚未出现，也可在仓库目录执行：

```bash
node scripts/install-cli.mjs --version v0.6.1
"$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli" --version
"$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli" doctor
```

安装器按系统和架构查找 release 资产，下载压缩包与 `SHA256SUMS.txt` 并校验后解包。默认会尝试第三方 GitHub 镜像，失败再回退官方源；完整性校验不等于独立签名验证。**下载成功仍需实际执行 `--version` 与 `doctor`**，以排除 CPU / 动态库不匹配。更详细的来源和限制见 [安全与隐私](SECURITY.md)。

安装 CLI 后刷新面板；若工具仍未出现，在 App 的「引擎」页重启引擎一次。

## 第一次使用

1. 打开 Craft 面板，执行「完整检测」，确认 CLI 已安装、版本和路径合理。
2. 保持净室模式，开启 MCP 桥。先让 AI 调用 `craft_status` 和 `craft_cli {"args":["doctor"]}`。
3. 提供要分析的网站 URL 或本机绝对路径，并说明希望得到什么结果。
4. 让 AI 先读取调查和会话状态，再打开目标，按需要加载工具集，并记录证据与结论。
5. 若需要读取目标内部代码或做反编译，再切到深度模式；等任务空闲时切换。
6. 需要 `rebuild` 时另行配置可用的编码智能体。先做最小生成测试，再运行耗时任务。

可以直接把这段话交给 AI：

```text
请使用 Craft 分析我提供的目标。先检查 CLI、MCP 和所需引擎，保持净室模式开始。
先读取调查/会话状态，再打开目标，按需加载工具集。
结论区分观察、推断和未知项，引用证据；最后输出 Markdown 报告。
目标：在这里填写 URL 或绝对路径。
```

更多实例见 [使用指南](docs/USAGE.md)。

## 几个需要分清的概念

| 名称 | 实际含义 |
| --- | --- |
| 净室 | CLI 限制在外部观察范围内的分析策略；不是操作系统沙箱 |
| 深度 | 允许内部代码、文件或页面源码等分析；仍取决于工具与依赖 |
| 全局模式 | 本主机所有会话共享，不是当前聊天单独的设置 |
| 关桥 | 隐藏 / 阻止 MCP 工具调用；不等于停止 CLI 进程，五个宿主工具仍在 |
| 全部工具 | 清空白名单，允许 CLI 当前提供的工具通过；不自动启用所有工具集 |
| 可见工具数 | 当前模式、工具集与白名单共同决定的数量 |
| CLI 能力数 | CLI 报告的能力总量，不代表全部外部引擎已安装 |
| 编码智能体已检测到 | 找到程序；仍需检查登录、模型、额度和可执行性 |

切换模式会替换 MCP 的 CLI 子进程。桥通常先等待在途任务并排队新调用；等待超时可能重放未答请求，旧版回退链路也可能重连。避免在安装、写文件、长任务中途切换，不承诺每次调用恰好执行一次。

## 已验证与限制

本机已有部署记录：Android / Ubuntu 24.04 proot / ARM64、官方 Craft CLI 0.6.1、真实 MCP 握手、最小网页 rebuild，以及 Ghidra 12.2 headless 与 Craft 反编译集成。相关依赖是本机后来单独安装的，**不会因为别人装了这个插件就自动拥有同样环境**。

本次发布副本的检查结果和验证范围见 [验证记录](docs/VERIFICATION.md)。手机面板没有移植桌面网页的依赖一键补齐、插件更新和自动重启按钮；其内部文案目前以中文为主，清单部分入口提供中英文名称。没有宣称已上架插件市场，也没有沿用上游的市场收录徽章。

Chromium、ADB、JADX、调试器、桌面 UI 和所有手机型号的兼容性需要单独验证。Ghidra ARM64 安装有额外本机组件要求，见 [依赖说明](docs/DEPENDENCIES.md)。

## 文档

- [完整安装、更新、回滚和卸载](docs/INSTALL.md)
- [界面、工具调用和分析 / 重建流程](docs/USAGE.md)
- [编码智能体、Ghidra 与其他依赖](docs/DEPENDENCIES.md)
- [配置、目录和架构](docs/CONFIGURATION.md)
- [排障与常见问题](docs/TROUBLESHOOTING.md)
- [测试范围和验证记录](docs/VERIFICATION.md)
- [GitHub 发布流程、仓库简介和 Release 文案](RELEASING.md)
- [安全与隐私](SECURITY.md) · [贡献方式](CONTRIBUTING.md) · [更新日志](CHANGELOG.md)
- [来源及许可说明](NOTICE.md) · [MIT 许可证](LICENSE)

## 许可与致谢

保留上游插件的 MIT 许可证和版权声明。本手机适配及随附文档按 MIT 许可提供。Craft Anything CLI、DSH、Ghidra、Java 和编码智能体遵循各自项目的许可和服务条款；本源码包不捆绑它们。完整归属见 [NOTICE.md](NOTICE.md)。
