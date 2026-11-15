# 安装、更新、回滚与卸载

## 1. 环境与终端

本插件面向 dsh-go 手机 App 的本机 Ubuntu 引擎。所有 shell 命令在该 Ubuntu 环境运行。Android 系统的 `sh`、ADB shell、Termux 自己的目录和 Ubuntu 的家目录不同，不能照搬路径。

```bash
node --version
dsh --version
git --version
uname -m
```

本机记录是 Ubuntu 24.04 proot、aarch64、Node 24.22.1。Node 的绝对最低版本未做跨版本测试；优先使用 dsh-go 环境自带的版本。CLI 是 Linux 可执行程序，不是 Android 原生 bionic 可执行程序。

插件需要宿主内的 `tools`、`dshGo` 与 MCP 客户端服务。普通远程 Linux 服务器若没有 dsh-go 桥，不能保证出现手机原生胶囊和面板。

如果基础工具缺失，在 Ubuntu 中安装：

```bash
apt-get update
apt-get install -y git curl ca-certificates tar unzip
```

系统包安装需要环境允许执行 apt；不要将该命令直接复制到 Android 系统 shell。

## 2. 选择安装方式

### 本地 Git 仓库

从本移动分支的发布仓库安装：

```bash
PLUGIN_DIR="${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything"
mkdir -p "$(dirname "$PLUGIN_DIR")"
git clone https://github.com/qingyunqingtong/dsh-go-craft-anything.git "$PLUGIN_DIR"
git -C "$PLUGIN_DIR" checkout v0.6.1-mobile.1
dsh plugin --profile web add "$PLUGIN_DIR"
```

`checkout` 需要该标签已经公开；跟随 main 时可以省略这一行。本地安装是链接引用，目录必须保留。不要复制到会自动清理的临时目录。

若提示目录已存在，先确认是不是当前运行的插件；按下文更新或备份后换一个新目录，不要直接覆盖。

### GitHub 包地址

```bash
dsh plugin --profile web add github:qingyunqingtong/dsh-go-craft-anything#v0.6.1-mobile.1
```

需要 Git、pnpm 可访问 GitHub。此路径与本地克隆方式二选一，不要重复装两份相同插件。

### Release zip

下载源码包并解压。找到包含 `package.json`、`lib`、`host`、`scripts` 的目录，复制到保留位置，再执行本地目录 `add`。

Android 共享存储通常不能像 Linux 文件系统一样提供完整执行权限和符号链接语义。发布资料可以留在下载目录；**运行插件和 CLI 优先放 Ubuntu 家目录**。首次安装前确认目标目录不存在。

示例，假设已经将源码解压到 Ubuntu 工作目录：

```bash
PLUGIN_DIR="${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything"
mkdir -p "$(dirname "$PLUGIN_DIR")"
cp -a ./dsh-go-craft-anything-release "$PLUGIN_DIR"
dsh plugin --profile web add "$PLUGIN_DIR"
```

## 3. 让入口生效

安装后查看聊天页输入框上方的「Craft 面板」和状态条，或 App 的「全部功能」。如果刚增加 / 修改宿主代码而没有出现，在 App「引擎」页重启本机引擎。

重启会短暂中断当前连接；等待 App 重新连上后再检测。清单通常自动重读，JavaScript 模块改动需要引擎重启。

不建议手写 profile 的依赖和补丁文件；安装 / 移除交给 `dsh plugin`。

## 4. 安装 CLI

推荐让 AI 调用：

```text
craft_install {"version":"v0.6.1"}
craft_status {"refresh":true}
craft_cli {"args":["doctor"]}
```

这三行是工具调用提示。在普通对话说明“请按这些参数调用工具”即可。

若宿主工具还没有加载，在源码根目录执行：

```bash
node scripts/install-cli.mjs --version v0.6.1
CLI="$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli"
"$CLI" --version
"$CLI" doctor
"$CLI" capabilities
```

如果 MCP 在没有 CLI 时启动失败，装好后重启 App 引擎再查看。`craft_install` 正常完成会通知已有桥更换子进程；首次缺 CLI 或自定义旧路径的场景仍可能需要重启。

默认安装路径为 `$HOME/.dsh/plugins-data/craft-anything`，**不会因为自定义 `DSH_HOME` 就必然改变**。使用独立实例时，阅读 [配置说明](CONFIGURATION.md) 并显式统一安装器 `--root`、host `installDir` 和 MCP `CRAFT_ANYTHING_ROOT`。

### 已有 CLI

可以在启动引擎的环境里设置：

```bash
export CRAFT_ANYTHING_CLI=/absolute/path/to/craft-anything-cli
```

环境变量只影响继承它的新进程；在终端执行 export 不会自动修改正在运行的 App 引擎。优先使用默认安装目录；复杂自定义路径需同时核对 host 和 MCP。不要以“host 检测到了”推定 MCP 已使用同一文件。

### 安装后确认

- `--version` 真正成功，不是只看到下载完成。
- `doctor` 说明 MCP 和当前任务所需依赖状态。
- 原生面板「完整检测」显示实际 CLI 路径和版本。
- 桥已开启，白名单允许所需工具。
- AI 可以列出 Craft 工具；数量随模式和工具集变化。

CLI 安装器在精确架构资产缺失时可能回退其他 Linux 架构资产，执行失败也可能只输出警告。因此必须人工核对 `uname -m`、资产文件名和真实版本命令。

## 更新插件

更新前等正在执行的分析 / 构建结束，提交或保存自己对插件的改动。

本地 Git 安装：

```bash
PLUGIN_DIR="${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything"
git -C "$PLUGIN_DIR" status --short
git -C "$PLUGIN_DIR" fetch --tags origin
```

确认工作树改动已经保留，再切换到**实际存在的新标签**：

```bash
git -C "$PLUGIN_DIR" checkout vNEW_MOBILE_VERSION
dsh plugin --profile web add "$PLUGIN_DIR"
```

`vNEW_MOBILE_VERSION` 是说明占位符。随后在 App 引擎页重启，重新完整检测。

GitHub 地址安装则用新标签重新 `dsh plugin --profile web add github:账号/仓库#新标签`。zip 安装建议把新版本放入另一个保留目录，再 `add` 指向该目录；旧目录留作回滚。

**不要使用保留的桌面网页更新器更新手机分支。** 它仍指向 Fanqi89 上游，且按桌面包名寻找 profile；手机面板没有提供这个按钮。

CLI 单独更新时让 AI 调用 `craft_install` 的指定版本。插件版本和 CLI 版本是两条独立发布线，不要求相等。

## 回滚

本地 Git 安装可以切回旧标签，再重新 `add` 并重启引擎；GitHub 安装重新添加旧标签。zip 安装重新 `add` 到先前保留的目录。不要覆盖 / 移动已经发布的 Git 标签。

模式、桥白名单和 CLI 数据不在源码目录内。回滚源码不会自动回滚这些状态；刷新面板再确认。

## 卸载

```bash
dsh plugin --profile web remove local-craft-anything
```

之后在 App 引擎页重启，确认入口消失。插件源码目录在完成移除后可自行清理；不要先删除仍被链接的目录。

卸载不会自动删除 CLI、下载缓存、Craft 项目、证据、Ghidra、Java、编码智能体、其登录信息或 headless profile。需要清理时先按 [目录说明](CONFIGURATION.md) 核对具体路径，并备份项目和配置；不要批量删除整个 `.dsh`。
