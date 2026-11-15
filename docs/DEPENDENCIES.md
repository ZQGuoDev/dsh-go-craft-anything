# 依赖安装与手机注意事项

## 按用途补依赖

| 用途 | 所需内容 | 本仓库是否附带 |
| --- | --- | --- |
| 原生面板 | dsh-go 原生桥、DSH tools / MCP 客户端 | 由宿主提供 |
| 基础 Craft 调用 | 可在 Ubuntu 中运行的 Craft CLI | 不附带，安装器另行下载 |
| rebuild 编码 | 可用编码智能体，或上游支持的模型后端 | 不附带 |
| 原生程序反编译 | Ghidra、兼容 Java、当前 CPU 的 native 组件 | 不附带 |
| 浏览器采集 | 可启动的 Chromium 等浏览器引擎 | 不附带，未完成本机验证 |
| Android 分析 / 调试 | 对应任务需要的 ADB、JADX 等 | 不附带 |
| 调试任务 | 对应架构 / 环境可用的 GDB 等 | 不附带 |

插件加载后自动只读检测本机依赖。在「Craft 面板 → 环境依赖 / 部署」查看结果，点击「一键部署」生成缺失清单，再确认部署。可用环境自动跳过，执行前复查；任务串行运行并显示进度与有限日志。没有确认不会下载或安装，未能验证的依赖不会被当作可用环境。

自动部署支持兼容平台上的 CLI、Java、GDB 和编码智能体；检测到已有其他受支持智能体时不会强装 Claude。Java 的通用检查下限为 21，但具体 Ghidra 版本可能需要更高版本。Ubuntu/proot 浏览器安装和 ARM64 Ghidra 等无法保证兼容的项显示手动处理，不进入自动清单。最后仍用 `doctor` 和所需工具验证任务环境。

## 编码后端：DSH Local

本机已有配置为：`kind=agent_cli`、`model=dsh`、`name=DSH Local`、`enabled=true`。这来自 Craft 的 DSH adapter，不是本插件另写的模型中转。其他用户应按自己 CLI 的 settings / 帮助配置；不要用本机完整配置覆盖自己的设置。

仅安装插件不会自动添加该后端，也不会自动复用 App 登录。先确认 `dsh headless --help` 可用，并检查当前 DSH headless 的凭据规则。

本机所用 DSH 文档说明：默认 headless profile 不使用 GUI 保存的托管凭据。若用户明确希望复用同一主机已保存的登录，可在 **备份原文件后**，将以下行合并进 `$DSH_HOME/profiles/headless/cordis.patch.yml`，不要覆盖整份补丁，也不要重复添加已有相同 id 的行：

```yaml
- id: credentials
  disabled: false
- id: authorization
  disabled: false
- id: deepseek-account
  disabled: false
```

不同 DSH 版本的 profile 可能不同，以当前版本的 headless 说明为准。这会改变 headless 使用凭据的来源；本发布包不包含该修改、不导出密钥、也不替你扩大执行权限。Android proot 是否支持所选执行策略应单独核对。

配置后先让编码后端在一个新建的测试目录生成单个文本文件，确认内容，再运行一次最小 `rebuild`。本机曾完成 `CRAFT_AGENT_OK` 文件生成和静态 HTML / CSS 网页构建，但不能推定其他人的凭据、模型和额度可用。

适配源码参考：[Craft DSH adapter](https://github.com/storytold/craft-anything/blob/main/crates/ai/src/cli_agents/adapters/dsh.rs)。

## 编码后端：Claude Code

可以按 [Claude Code 官方安装说明](https://code.claude.com/docs/en/setup) 安装。若当前版本仍支持 npm 方式：

```bash
npm install -g @anthropic-ai/claude-code
claude --version
claude
```

最后一步按其交互完成登录 / 授权。安装成功和登录成功是两件事。官方可能调整分发方式，遇到不兼容按当前文档处理。

Craft 0.6.1 的集成预览和应用示例：

```bash
CLI="$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli"
"$CLI" setup --client claude_code --dry-run
"$CLI" setup --client claude_code --yes
```

setup 会修改对应客户端的 MCP / skill 配置；先看 dry-run。它不是 Claude 登录命令，也不等于已经选好了 Craft rebuild 后端。

本机曾安装 Claude Code 2.1.325，但未登录，因此未用它作为默认构建后端。

## Ghidra：ARM64 不能只解压

本机验证版本为 Ghidra **12.2**、Java **25**。官方包的 Linux native 组件主要为 x86_64，本机 ARM64 额外编译了：

- `decompile` 与 `sleigh`，放进 `Ghidra/Features/Decompiler/os/linux_arm_64/`。
- GNU demangler v2_24 与 v2_41，放进 `GPL/DemanglerGnu/os/linux_arm_64/`。

本仓库不附带 Ghidra 二进制。请从 [官方 Releases](https://github.com/NationalSecurityAgency/ghidra/releases) 取发行包并核对官方校验值，再按对应版本的安装说明选择 Java。不要把“Java 21+”当作所有 Ghidra 版本都够用；本机的 Ghidra 12.2 使用 Java 25。

可按需要安装编译依赖：

```bash
apt-get update
apt-get install -y build-essential unzip file bison flex pkg-config zlib1g-dev
```

Java 包取决于自己的软件源和 Ghidra 版本；确认后安装对应 JDK。本机额外装了 `openjdk-25-jdk-headless`，没有改系统默认 Java。

本机 ARM64 native 构建命令见 [构建脚本](../scripts/build-ghidra-arm64.sh)，仅针对 Ghidra 12.2 的目录结构有部署记录。示例：

```bash
GHIDRA_INSTALL_DIR=/opt/ghidra bash scripts/build-ghidra-arm64.sh
```

先设置 Ghidra 指向需要的 Java，再真实执行 `support/analyzeHeadless` 导入一个自编译的小型 ELF 并请求反编译函数。只检查路径存在或 `java --version` 不能证明反编译器可运行。

### 将已有 Ghidra 告诉 Craft

Craft 0.6.1 支持下述设置。路径必须替换为自己的实际路径：

```bash
CLI="$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli"
"$CLI" settings_set --json '{"key":"engines.ghidra.install_dir","value":"/opt/ghidra"}'
"$CLI" settings_set --json '{"key":"engines.ghidra.java_home","value":"/usr/lib/jvm/java-25-openjdk-arm64"}'
"$CLI" settings_set --json '{"key":"engines.ghidra.memory_gb","value":2}'
"$CLI" settings_set --json '{"key":"engines.ghidra.startup_timeout_secs","value":180}'
```

2 GiB 和 180 秒是本机测试配置，不是所有手机都适合的固定值。内存小的设备应减少并发与分析规模。

必要时为插件 CLI 子进程配置 `GHIDRA_INSTALL_DIR`、`JAVA_HOME`、`PATH`，见 [配置说明](CONFIGURATION.md)。更新这些环境变量后，在 App 引擎页重启，再完整检测。使用内部反编译工具前需深度模式。

官方资料：[Ghidra 12.2 Release](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.2_build)、[Getting Started](https://github.com/NationalSecurityAgency/ghidra/blob/Ghidra_12.2_build/GhidraDocs/GettingStarted.md)。

## 浏览器、ADB、JADX 与调试器

这些引擎按任务单独安装。不要照搬桌面的一键安装结果：Ubuntu proot 的 Chromium 可能涉及 Snap、系统调用或浏览器沙箱问题；ADB 访问手机需要正确连接方式；调试器也受 proot 与 Android 限制。本次没有验证这些链路，报告问题时附上该引擎的实际启动错误和版本。

## 手机资源

下载 Ghidra、JDK、浏览器会占用较多空间，实际大小随版本变化。构建 / 反编译会占 CPU 和内存；先用小样本、一轮 rebuild 和单个分析任务确认可运行。App 转后台后可能受 Android 的进程和电池管理影响，长任务应定期检查产物与日志。
