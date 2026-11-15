# 参与开发

本仓库是 dsh-go 原生手机适配，尽量复用上游 host / scripts。不要把网页 Cordis 插槽当作手机原生面板 API。

修改前阅读 README、docs/CONFIGURATION.md 与 NOTICE.md。原生入口在 package.json 的 dshGo 中声明，视图与动作在 lib/mobile.js。manifest-mobile.json 必须和实际清单一致；不要加入密钥、任意 HTML / CSS 或凭空编造的组件。

代码修改后运行：

```bash
node --test tests/mobile.test.mjs
node tests/bridge/run.cjs
node tests/bridge/bool-schema.mjs
node tests/install-cli/run.cjs
```

在 dsh-go 环境再用自带检查器 `--load` 验证原生清单和视图。修改 lib / host 后需重启 App 引擎才能验证实际加载代码。提交说明写清触发条件、结果、已测试环境和未验证部分。

保持 package.json 与 dsh.plugin.json 版本一致。保留上游 MIT 许可；来自外部的代码注明来源和许可。不要更改上游硬编码更新器使其误指向他人的仓库，手机分支改更新机制前先明确 profile、包名和 Android 生命周期处理。

提交只包含源码和必要资料，不包含 CLI 二进制、node_modules、下载缓存、个人配置、诊断或目标文件。跨平台未实际验证时，明确标注。
