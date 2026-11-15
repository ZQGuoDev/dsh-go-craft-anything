# 故障排查与常见问题

## 装了没有胶囊 / 面板

1. 确认用的是 dsh-go 手机 App 原生界面，且当前连接本机引擎。
2. 手机安装命令使用 `--profile web`；没有误装到 desktop 或另一个主机。
3. 确认安装路径存在，且根目录直接含 package.json。
4. 在 App「引擎」页重启；回到聊天或全部功能查看。
5. 运行原生检查器，路径按实际安装修改：

```bash
PLUGIN_DIR="${DSH_HOME:-$HOME/.dsh}/dsh-go/plugins/local-craft-anything"
node "${DSH_HOME:-$HOME/.dsh}/skills/dsh-go-plugin/kit/bin/check.mjs" "$PLUGIN_DIR" --load
```

本机检查器来自 dsh-go 技能环境；若自己的宿主没有它，记录缺失情况，不要从不明来源复制运行脚本。老 App 可能没有加号工具等插槽，先确认面板和基本胶囊。

## 面板有了，CLI 未安装

面板和 CLI 分开安装。让 AI 调用 `craft_install`，或按 [安装指南](INSTALL.md) 执行脚本。安装后实际运行 `--version`。查看文件存在不等于可执行。

## CLI 已安装，但 MCP 工具没有出现

- 桥是否关闭？面板点「开桥」。
- 白名单是否过窄？先确认需要的原始工具名；必要时短暂选择「全部工具」。
- CLI 是否只加载 Essentials？按需加载工具集。
- 最初没有 CLI 导致 MCP 启动失败？安装后重启 App 引擎。
- host 和 MCP 是否使用不同 CLI 路径 / 数据根？检查配置和面板桥状态。
- 首次重新连接需要一点时间；先读状态，不要连续重装。

“全部工具”只清白名单，不保证直接出现全部工具集。

## Exec format error / Permission denied / No such file

`Exec format error` 通常提示架构不匹配；`Permission denied` 可能是共享存储不支持执行；`No such file` 也可能是 ELF 动态加载器缺失。

```bash
uname -m
file "$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli"
"$HOME/.dsh/plugins-data/craft-anything/bin/craft-anything-cli" --version
```

ARM64 对应 Linux aarch64，不是 x86_64，也不是 Windows exe。将 CLI 放 Ubuntu 家目录。若资产不匹配，从上游 release 取适合当前架构的版本；安装器可能在缺少精确资产时回退另一架构并警告，不能只看安装退出码。

## 下载失败 / GitHub 访问失败

记录失败发生在插件 Git 克隆、release 元数据、压缩包、校验文件还是 apt/npm。分别检查网络 / 代理；代理地址不能只在 Android 侧有效而在 Ubuntu 中不可达。

默认 GitHub 镜像候选可能不可达。可以使用自己的可信镜像配置，或在本机当前版本的镜像规则下将候选指向官方 GitHub；不要通过跳过 hash 检查解决下载问题。SHA256 不匹配时停止使用该文件，从可信来源重新取压缩包与校验值。

## 模式切换慢 / 配置和运行模式不同

桥正在等待旧任务结束或子进程启动。稍后刷新状态，查看是否仍为切换中。不要连续反复点模式按钮。长任务、写文件或安装期间等任务结束再切。

设置保存不代表立即应用成功。若 CLI 自身不能启动，先排查 CLI 执行；若桥持续不恢复，在没有运行任务时通过 App 重启引擎。

## rebuild 找不到智能体 / 401 / 登录失败

“检测到 claude / dsh”只证明路径存在。检查：

- 编码后端是否已在 Craft 启用并选中。
- 智能体是否登录、模型路由和额度是否可用。
- headless 是否按自己的意愿配置凭据来源。
- 当前执行策略和工作目录是否可写。

本机默认使用配置好的 DSH Local；插件安装不会将这套本机配置复制给其他人。Claude Code 未登录时不应设为默认可用后端。

## Ghidra 找到了但反编译失败

检查兼容 Java、Ghidra 设置和当前 CPU 的 decompile / sleigh / demangler。本机 Ghidra 12.2 使用 Java25，ARM64 需要额外 native 构建。先真实运行 headless 小样本，再通过 Craft 集成测试；只设置 GHIDRA_INSTALL_DIR 不等于已通过检测。

内部反编译还需要深度模式。手机内存不足、超时与大样本分析也会失败，减少分析规模并查看实际错误。

## 工具 schema 导致模型 400

继承的 0.6.1 桥会将 tools/list 的布尔子 schema 规范化，以适配部分 llama.cpp 类后端。若仍失败，记录模型后端、CLI 和插件版本、工具名及脱敏错误，不要直接删除任意工具参数。

## 面板数量和旧 README 不一样

CLI 版本、净室 / 深度、工具集、白名单和外部引擎均影响显示。CLI 总能力、MCP 可见工具数、引擎已安装数量是不同概念。以当前实测为准。

## 手机上耗时任务中断

核对 App 与 Ubuntu 引擎是否仍存活，Android 是否回收进程、存储是否满。先查看产物和进度再决定重跑。工具超时不会自动撤销已完成写入。

## 怎么反馈

使用本仓库的 bug issue 模板。提供 App / DSH / 插件 / CLI 版本、CPU、Ubuntu版本、安装方式、复现步骤、预期与实际表现、相关命令退出码。

错误日志摘取必要部分，手工删除 token、API key、代理认证、个人目录和敏感目标信息。不要上传整个插件数据根、env.json、http.token、完整 Craft 配置、诊断包或未脱敏截图。若用 dsh-go 的诊断导出，外发前仍需检查。
