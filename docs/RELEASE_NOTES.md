## dsh-go 原生 Craft 面板首个发布候选

版本：0.6.1-mobile.1。基于 Fanqi89/dsh-craft-anything 0.6.1（MIT）制作，面向 Android 上 dsh-go 的 Ubuntu / proot 本机引擎。CLI 来自 storytold/craft-anything，需独立安装。

### 新增

- 聊天页「切换模式」「Craft 面板」胶囊和本机模式 / CLI 状态条。
- 对话详情、全部功能及支持插槽的加号面板入口。
- CLI 路径 / 版本、CPU 架构、模式、桥状态、白名单、工具数量、引擎与编码后端探测。
- 刷新 / 完整检测、净室 / 深度、开桥 / 关桥、仅核心 / 全部白名单及复制常用命令。
- 保留 craft_status、craft_cli、craft_install、craft_mode、craft_bridge 和 MCP 接入。
- 完整中文安装、使用、依赖、排障、配置、隐私和发布文档。

### 安装

```bash
dsh plugin --profile web add github:qingyunqingtong/dsh-go-craft-anything#v0.6.1-mobile.1
```

也可按 README 将源码克隆到 Ubuntu 的保留目录，再使用本地路径安装。需要时在 App「引擎」页重启。

装好插件后让 AI 调用 craft_install 安装 CLI，再运行 craft_status 与 doctor。建议首次固定已验证 CLI v0.6.1。

### 验证与限制

本机有 Android Ubuntu 24.04 proot / ARM64 的 CLI 0.6.1、真实 MCP、DSH Local 最小 rebuild 和 Ghidra 12.2 headless / 反编译集成记录；外部依赖不随源码分发。发布副本检查详情见 docs/VERIFICATION.md。

模式和桥设置是全主机共享；“全部工具”仅放开白名单，不自动加载所有工具集或安装引擎。切模式会替换 CLI 子进程，建议任务空闲时操作。

没有移植桌面一键补齐依赖、网页插件更新和自动重启按钮；内部网页更新器仍指向上游，不作为手机更新方式。其他手机型号、浏览器 / ADB / JADX 等引擎和桌面交互不在本次全面验证范围。

保留上游 MIT 许可和来源。详见 README、NOTICE.md 与 SECURITY.md。
