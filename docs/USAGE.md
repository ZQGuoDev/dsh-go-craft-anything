# 使用流程与工具示例

## 面板入口与按钮

聊天输入框上方有「切换模式」「Craft 面板」两个胶囊。状态条也能进入面板；支持相应插槽的 App 还会在加号工具中显示 Craft，并在对话详情和全部功能中显示 Craft 本机状态。

| 操作 | 行为 |
| --- | --- |
| 刷新状态 | 读取本地状态，复用 host 的探针缓存 |
| 完整检测 | 等待正在进行的探针结束，再请求重新检测版本与能力 |
| 环境依赖 / 部署 | 打开自动检测结果与一键部署面板 |
| 一键部署 | 重新检测并生成缺失清单，尚不安装 |
| 确认部署 / 暂不部署 | 确认后在本机后台串行安装，取消则不安装 |
| 净室 / 深度 | 改本主机全局模式，等待桥应用；不是每会话设置 |
| 开桥 / 关桥 | 允许 / 阻止 `mcp__craft__*` 工具暴露和调用 |
| 仅核心 | 写入 `allow: ["core_*"]`，不改变当前 enabled |
| 全部工具 | 写入 `allow: []`，不改变当前 enabled，也不主动加载所有工具集 |
| 复制常用命令 | 写剪贴板；不自动发送，不触发安装 |

打开期间每 60 秒更新本地状态并请求共享缓存探针。最后一个界面订阅关闭后取消对应探针；插件卸载时取消订阅和计时器。频繁点完整检测没有必要。

“配置模式”和“桥运行模式”不同说明桥尚未应用、正在切换或没有运行。等待片刻再刷新。模式切换可能先保存配置，稍后才应用；以桥运行状态和实际工具列表为准。

## 宿主工具

下面都是 **AI 工具调用格式**，在 dsh-go 对话里让 AI 执行。shell 用户直接运行 CLI 可执行文件。

### 状态与诊断

```text
craft_status {"refresh":true}
craft_cli {"args":["doctor"]}
craft_cli {"args":["capabilities"]}
craft_cli {"args":["commands"]}
```

状态中的编码智能体是发现结果，不是一次成功登录检查；能力数量也不是可用引擎数量。

### 安装

```text
craft_install {"version":"v0.6.1"}
```

`force:true` 重新下载 / 安装，适合明确需要重装的情况。`latest` 跟随上游最新版，可能超出本仓库已验证范围，首次使用建议固定已验证版本。

### 模式

```text
craft_mode {}
craft_mode {"mode":"deep"}
craft_mode {"mode":"clean"}
```

不带 mode 只读取。深度允许分析内部资料；净室保持外部观察策略。策略由支持这些启动参数的 CLI 执行，不是 Linux 权限隔离。

切模式时桥尝试等待在途调用，随后替换 CLI 子进程并更新列表。排空超时可能重放未答请求；写入、安装、构建等副作用操作应等结束再切换。不要通过连续反复切换来确认某次写操作是否完成。

### 桥与白名单

```text
craft_bridge {}
craft_bridge {"enabled":false}
craft_bridge {"enabled":true,"allow":["core_*"]}
craft_bridge {"enabled":true,"allow":[]}
```

白名单匹配的是 Craft 原始工具名，例如 `core_*`，不是加上 `mcp__craft__` 前缀的名字。只支持 `*` 通配符，大小写不敏感。

关桥后宿主的五个 `craft_*` 工具仍可用；CLI 子进程也可能继续运行。关桥不是暂停所有任务、断网或撤销外部操作。

## 流程一：分析本地文件

给 AI 的话：

```text
请用 Craft 分析 /absolute/path/to/sample。
先确认文件类型、分析模式及所需引擎；读取调查和会话状态，再打开目标。
先做低成本摘要，按需加载工具集；给出行为说明和证据引用。
需要读取内部代码时说明原因，再按我的要求使用深度模式。
```

建议调用顺序：

1. `craft_status` / `doctor` 确认环境。
2. `mcp__craft__core_investigation_show`、`mcp__craft__core_session_show` 读取现有状态。
3. `mcp__craft__core_target_open` 打开目标，path 使用 Ubuntu 看得到的绝对路径。
4. 按实际 schema 调用 triage / evidence / report 等核心工具。
5. 工具不在列表时调用 `mcp__craft__list_toolsets`、`mcp__craft__enable_toolset` 按需启用工具集；若“仅核心”把它们过滤了，先放开白名单。
6. 先请求 summary，再分页看细节；记录 brief、plan、hypothesis、finding 和 handoff。

MCP 参数 schema 随 CLI 版本变化，请让 AI 使用当前实际返回的 schema，不要照搬历史博客里的参数。

## 流程二：分析网站

提供 URL 与目标，例如“整理页面布局、交互状态和可见流程，输出实现规格”。使用 CLI 当前提供的网站 / 浏览器工具；浏览器采集需要可运行的 Chromium 等依赖。

本机没有验证完整 Chromium 链路。若缺浏览器，先让 `doctor` 和引擎列表给出缺项，不要把工具存在视为浏览器可启动。

## 流程三：让编码智能体重建

先阅读 [依赖说明](DEPENDENCIES.md)，配置可用编码后端，再让 AI 调用：

```text
craft_cli {"args":["rebuild","https://example.com","实现这个页面的可见布局与交互","--rounds","1","--project-folder","/root/workspace/craft-projects/demo"],"timeoutMs":900000,"maxOutputChars":12000}
```

不依赖现有目标的创建任务：

```text
craft_cli {"args":["rebuild","-","用 HTML 和 CSS 制作一个静态待办展示页","--rounds","1","--project-folder","/root/workspace/craft-projects/todo"],"timeoutMs":900000}
```

路径是示例，可替换为 Ubuntu 下自己的工作目录。`--project-folder` 明确产物位置，避免依赖桌面默认目录。

`craft_cli` 默认超时 120 秒；长任务可提高 `timeoutMs`，0 表示不限时。取消和超时会尝试回收进程，已写入的文件、下载内容或远端行为不会因此自动回滚。重新执行前先检查已有产物与任务状态。

单次 CLI 任务需要内部分析时可在 args 加 `--deep`；这不等于修改长期 MCP 全局模式。具体子命令是否支持该参数以当前 `commands` / 帮助为准。

## 结果交付

让 AI 输出分析范围、关键发现、证据 ID、推断与未知项，并说明哪些功能没有实测。需要保存时明确要求 Markdown 报告及输出目录。分析报告、证据库和源码产物属于你的项目数据，不应默认加入插件发布仓库。
