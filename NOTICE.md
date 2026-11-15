# 来源与第三方许可

## 上游插件

项目：[Fanqi89/dsh-craft-anything](https://github.com/Fanqi89/dsh-craft-anything)

来源版本：0.6.1。许可证：MIT，Copyright (c) 2026 fanqi。完整声明保留在根目录 [LICENSE](LICENSE)，不要删除或改成只署名移动适配维护者。

用户提供的参考镜像：[hbsyzstq/dsh-craft-anything](https://github.com/hbsyzstq/dsh-craft-anything)。该镜像作为资料参考；本机已部署源码标注上游为 Fanqi89。

保留上游 host、MCP 桥、安装器、网页实现与测试。原上游 README、CHANGELOG 和 RELEASING 存档于 [docs/upstream](docs/upstream)。存档中的桌面安装、市场徽章、更新脚本和数量不代表本移动分支已验证或已上架。

## 手机适配与发布整理

手机适配包名 `local-craft-anything`，版本 `0.6.1-mobile.1`。主要新增 / 调整：

- `lib/index.js` 组合 host 和原生桥；`lib/mobile.js` 提供原生面板与动作。
- `dshGo` 清单、独立 `manifest-mobile.json` 和 mobile 回归测试。
- 以手机为首页的完整中文文档，区分源码、CLI、引擎和本机依赖验证。
- 发布副本统一 package / dsh.plugin 的版本和移动 id；删除指向上游的发行仓库元数据，来源单独保留。
- 补充隐私忽略规则和 GitHub issue 模板；收录本机 Ghidra ARM64 native 构建命令。
- 旧 PowerShell 发布脚本增加默认禁用保护，避免误发到上游。

手机适配及文档按 MIT 提供。移动分支发布者为 [ZQGuoDev](https://github.com/ZQGuoDev)，仓库为 [dsh-go-craft-anything](https://github.com/ZQGuoDev/dsh-go-craft-anything)。保留上游作者 fanqi 的归属和 MIT 版权声明。

## 外部程序

- [Craft Anything](https://github.com/storytold/craft-anything)：上游 MIT OR Apache-2.0，按其仓库和发行包的实际许可执行；本包不捆绑 CLI。
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) / dsh-go：按各自分发版本的许可与文档使用；本包不捆绑宿主。
- [Ghidra](https://github.com/NationalSecurityAgency/ghidra)：按官方项目许可和第三方声明使用；本包不捆绑 Ghidra / Java。
- Claude Code、Chromium、JADX、GDB 等：按各项目许可及服务要求使用，均不随本包分发。

本项目没有声称是 Craft Anything、ArtCraft、Storytold 或 DSH 的官方手机发行版。保留 icon.svg 来自上游插件，不另行声称是本移动分支原创。
