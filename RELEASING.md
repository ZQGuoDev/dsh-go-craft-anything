# 将手机版发布到 GitHub

本移动分支发布于 [qingyunqingtong/dsh-go-craft-anything](https://github.com/qingyunqingtong/dsh-go-craft-anything)。本文供维护者后续发版或其他人建立自己的 fork 时参考；账号、仓库和版本必须与实际发布位置一致。

建议仓库名 `dsh-go-craft-anything`，插件运行包名保留 `local-craft-anything`。当前版本 `0.6.1-mobile.1`，建议首发标签 `v0.6.1-mobile.1`，并在 GitHub 勾选 **pre-release**：该版本本身带 SemVer 预发布后缀。

## 1. 建仓库时可直接填写的内容

**Repository name**

```text
dsh-go-craft-anything
```

**Description**

```text
Craft Anything 的 dsh-go 手机原生适配：Craft 面板、净室/深度切换、MCP 桥、CLI 状态与安装工具，支持 Android Ubuntu/proot。
```

**Topics**

```text
dsh-go dsh-plugin deepseek-harness craft-anything mcp android ubuntu proot reverse-engineering
```

设置 Public 才能让其他人直接下载 / 安装。已有源码时创建空仓库，不要额外自动生成冲突的 README 或许可证。保留本包原 MIT 许可证及来源说明。

## 2. 补上自己的发布地址

本分支安装地址已填写为 `qingyunqingtong/dsh-go-craft-anything`。建立其他 fork 时，将安装示例和包元数据中的发布地址一起改为自己的仓库，保留上游来源链接。`vNEW_MOBILE_VERSION` 是更新教程的示例占位符。

package.json 的 repository / homepage / bugs 已指向本移动分支，原上游归属保留在 x-upstream 和 LICENSE。创建其他 fork 时同步调整这些字段：

```json
{
  "repository": {"type":"git","url":"git+https://github.com/qingyunqingtong/dsh-go-craft-anything.git"},
  "homepage":"https://github.com/qingyunqingtong/dsh-go-craft-anything#readme",
  "bugs":{"url":"https://github.com/qingyunqingtong/dsh-go-craft-anything/issues"}
}
```

这是需要合并进 package.json 的字段片段，不要拿它覆盖整份文件。保留 x-upstream 来源和原 author / LICENSE，可另外添加 contributors 记录自己的贡献。

检查以下项目：

- package.json 与 dsh.plugin.json 的 version 一致。
- 包名、lib/index.js 导出的 name、补丁中的 name 一致为 local-craft-anything。
- manifest-mobile.json 与 package.json 的 dshGo 一致。
- README 没有声称是官方发行、全引擎可用或已经被市场收录。
- README 安装命令使用手机的 web profile。
- screenshots 如需添加，使用自己实际版本截图，检查聊天、路径、token 和个人信息。本次包中没有截图，不使用概念图冒充实机。

**旧 scripts/release.ps1 已加默认禁用保护**，因为它硬编码上游仓库。不要用它发布手机版。host/update.mjs 的网页更新器同样不适用于移动分支，目前保留源码但不从手机面板暴露。

## 3. 发布前本地检查

在 Ubuntu 的仓库根目录运行：

```bash
node --test tests/mobile.test.mjs
node tests/bridge/run.cjs
node tests/bridge/bool-schema.mjs
node tests/install-cli/run.cjs
```

有 dsh-go 检查器的环境再运行：

```bash
node "${DSH_HOME:-$HOME/.dsh}/skills/dsh-go-plugin/kit/bin/check.mjs" "$PWD" --load
```

验证记录见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。修改代码后重跑受影响的检查；如果只是更改自己仓库 URL，至少重新校验 JSON 和文档链接。

Git 提交前核对文件列表。运行数据不在仓库内；.gitignore 只是辅助，不会自动移除已经加入 Git 的秘密文件。不要上传 .env、env.json、http.token、Craft 配置 / 缓存、模型登录信息、诊断包、研究目标或私有项目。

## 4. 发布方式 A：GitHub 网页上传

适合主要用手机操作：

1. 新建空仓库。
2. 解压源码 zip。不要只把 zip 作为根目录的唯一文件上传：GitHub 需要直接看见 README.md、package.json、lib、host 等。
3. 使用 GitHub 网页 Add file → Upload files 上传**解压目录里的内容**。如果浏览器不能可靠保留子目录，改用下面的 Git 方式。
4. 提交到 main，打开仓库首页确认 README 正确渲染。
5. 检查安装地址已经替换；确认源码根目录不是多套了一层文件夹。
6. 到 Releases → Draft a new release，创建 `v0.6.1-mobile.1` 标签，target 选择这次提交。
7. 填写下文 Release 文案；勾选 pre-release，附上源码 zip 与 SHA256SUMS.txt。
8. 发布后从仓库标签下载到新的 Ubuntu 测试目录，按 README 再装一次。

网页上传也要保留 .gitignore 和 .github 模板；浏览器隐藏文件时用 Git 方式更可靠。

## 5. 发布方式 B：终端 Git

在 **自己的发布仓库副本**里执行，不是在当前运行的插件目录里操作：

```bash
git init -b main
git add .
git diff --cached --stat
git status --short
```

确认待提交内容后：

```bash
git commit -m "Release dsh-go Craft Anything 0.6.1-mobile.1"
git remote add origin https://github.com/qingyunqingtong/dsh-go-craft-anything.git
git push -u origin main
git tag -a v0.6.1-mobile.1 -m "dsh-go Craft Anything 0.6.1-mobile.1"
git push origin v0.6.1-mobile.1
```

需要 GitHub 认证时按自己 Git 客户端支持的方式登录，不要把 token 写进 remote URL、提交文件或截图。若 git 没有用户名 / 邮箱，按自己的公开署名设置后再 commit。

然后在 GitHub 网页创建对应 Release。已装 GitHub CLI 的用户也可执行：

```bash
gh release create v0.6.1-mobile.1 --prerelease --verify-tag --title "v0.6.1-mobile.1 — dsh-go 原生 Craft 面板" --notes-file docs/RELEASE_NOTES.md
```

Release 资产另外上传；只上传完成校验的源码包和校验清单。不要发布本机 CLI / Ghidra 打包镜像冒充本源码包。

## 6. 发布后核验

- 仓库首页、LICENSE、NOTICE 和文档链接可公开打开。
- 标签指向预期提交，Release 不是只有说明而没有代码标签。
- 用**实际仓库账号**运行一次固定标签安装，检查包名 / 版本 / 胶囊 / 面板。
- CLI 与 Ghidra 等依赖按独立安装说明准备；测试时记录哪些是原先已有的。
- Release 与 README 的已验证范围一致，没有继承上游桌面市场徽章或虚构下载量。
- 安装失败时保留错误并修复发布，不通过移动旧标签来替换内容。

## 版本规则

已公开版本、标签和对应源码不可复用。修改后发 `0.6.1-mobile.2` 或其他新的合法 SemVer 版本，同步两个清单、更新日志和发布说明。将来做稳定移动版可另选清晰版本线并说明与上游版本关系。

旧标签保留，便于回滚；不要 force push 覆盖发布标签。上游插件版本、移动适配版本和 CLI 版本分别记录。

## 插件市场

GitHub 发布不等于自动上架任意插件市场。需要收录时按目标市场当前规则单独提交，提供仓库、元数据、截图与安装方式。没有实际收录结果前不要添加“已收录 / 官方推荐”的徽章。
