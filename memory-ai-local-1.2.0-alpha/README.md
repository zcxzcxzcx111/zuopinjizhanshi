<p align="center">
  <img src="assets/memory-logo.png" alt="Memory AI Local logo" width="96" />
</p>

# Memory AI Local

> **Local-first Developer Memory for coding agents.** 让 Codex、Claude Code、Antigravity 等 Coding Agent 读取同一份可追溯、可授权、可撤销的项目上下文，而不是每次换 Agent 都重新复制整段对话。

![Version](https://img.shields.io/badge/version-1.2.0-111111)
![Status](https://img.shields.io/badge/status-Alpha-f2b84b)
![Node](https://img.shields.io/badge/Node.js-%3E%3D22.5-43853d)
![Storage](https://img.shields.io/badge/storage-local%20SQLite-5b67d6)
[![Tests](https://github.com/Hsoley1/memory-ai-local/actions/workflows/test.yml/badge.svg)](https://github.com/Hsoley1/memory-ai-local/actions/workflows/test.yml)

Memory AI Local 是一个运行在个人电脑上的 **Developer Memory + Life Memory 实验应用**。当前产品主线是 Developer Memory：保存项目目标、决策、约束、偏好、任务与交接包，并通过本地 MCP 按权限提供给不同 Coding Agent。

Life Memory 用于管理人物、照片、Live Photo 和故事草稿。它与开发数据共用本地服务和 SQLite 文件中的不同数据表，但在产品与 MCP 接口层严格隔离：**Coding Agent 没有任何读取 Life Memory 的工具。**

> [!IMPORTANT]
> 当前版本是供本地试用和产品验证的 Alpha，不是云服务，也不是已经完成安全加固的生产级密码保险库。请先阅读下方的[隐私与安全边界](#隐私与安全边界)。

## 它解决什么问题

Coding Agent 很强，但项目记忆通常被困在某个产品、某次对话或某个上下文窗口里。换模型、换客户端或开启新对话时，用户往往需要手动总结：

- 这个项目为什么这样设计？
- 哪些约束绝对不能违反？
- 我偏好的代码风格和协作方式是什么？
- 已经完成什么，下一步是什么？
- 新 Agent 最少需要知道哪些内容？

Memory AI Local 把这些内容变成一个由用户控制的本地记忆层：

```text
项目文件 / Git / 用户记录
          ↓ 手动扫描与筛选
   Memory AI Local（SQLite）
          ↓ 独立凭证 + 项目权限 + Token 预算
 Codex / Claude Code / Antigravity / 其他 MCP 客户端
          ↓ 写入只生成候选
        用户批准后落库
```

## 当前已经实现

### Developer Memory

- 项目、开发记忆、任务、敏感标记、修订版本和访问记录。
- SQLite 关键词检索，以及按 Token 预算生成的精简项目上下文。
- 按 revision 获取增量变化，避免 Agent 反复读取全部信息。
- 面向 Agent 切换的精简交接包，不附带完整原始对话。
- 手动扫描项目文件夹、Git 最近 30 条提交，以及 `AGENTS.md`、`CLAUDE.md`、`SKILL.md` 等指令文件。
- 扫描内容先进入本地数据源索引；建议写入长期记忆的内容仍需用户审批。
- 完整本地备份、SHA-256 清单校验和替换式恢复；恢复前自动创建安全备份。

### Agent 权限与 MCP

- Codex、Claude Code、Antigravity 使用彼此独立的本地凭证。
- 每个 Agent 可分别配置项目读取、搜索、候选写入、交接和敏感记忆权限。
- 在网页中关闭某个客户端后，旧凭证下一次调用即失效，不影响其他 Agent。
- Agent 对记忆和任务的“写入”只会创建待审批候选，不能绕过用户直接改变长期记忆。
- 提供真实 STDIO MCP 自检，验证工具列表、授权读取和写入保护。

### Life Memory（实验功能）

- 人物档案、照片和视频的本地导入与时间线。
- JPEG EXIF 读取；保留 HEIC 原文件。
- 同名照片与 MOV 的 Live Photo 配对。
- 关联人物、地点、时间和说明，并生成本地故事草稿。
- Life Memory 不通过 MCP 暴露给 Coding Agent。

## 8 个 MCP 工具

| 工具 | 用途 | 写入行为 |
| --- | --- | --- |
| `list_projects` | 列出当前客户端获准访问的项目，不返回绝对路径 | 只读 |
| `get_project_brief` | 按预算读取项目目标、任务和关键记忆 | 只读 |
| `search_memories` | 搜索少量记忆摘要，敏感内容默认隐藏 | 只读 |
| `get_memory` | 已知记忆 ID 时按需读取完整内容 | 只读 |
| `get_changes` | 读取指定 revision 之后的增量变化 | 只读 |
| `propose_memory` | 提交一条长期记忆候选 | 用户批准后才落库 |
| `propose_task_update` | 提交任务状态或标题修改候选 | 用户批准后才修改 |
| `create_handoff` | 按权限和预算生成精简 Agent 交接包 | 创建本地交接记录 |

## 为什么更节省 Token

Memory AI Local 不把数据库、项目目录或历史聊天整包塞进上下文。推荐的调用方式是：

1. 项目开始时调用一次 `get_project_brief`，默认预算为 600。
2. 遇到具体问题时才调用 `search_memories`，先看少量摘要。
3. 只有确实需要细节时，再按 ID 调用 `get_memory`。
4. 长任务用 `get_changes` 获取增量，不重复拉取完整上下文。
5. 切换 Agent 前调用 `create_handoff`，只交接目标、决策、约束和待办。

预算是近似的上下文控制值，并非模型厂商账单中的精确 Token 计量。

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) **22.5.0 或更高版本**
- 现代浏览器
- 无需云账号，也无需安装第三方 npm 依赖

先确认 Node 版本：

```bash
node --version
```

### Windows

下载或克隆项目后，直接双击：

```text
Start Memory AI.cmd
```

浏览器会自动打开 <http://127.0.0.1:3765>。使用期间请保持命令窗口开启；关闭窗口即停止本地服务。

也可以在 PowerShell 中运行：

```powershell
npm.cmd start
```

如果 PowerShell 提示脚本执行策略限制，请继续使用上面的 `npm.cmd`，不要修改系统执行策略。

### macOS / Linux

当前自动打开浏览器的脚本针对 Windows。macOS 或 Linux 请在项目目录运行：

```bash
MEMORY_AI_NO_BROWSER=1 npm start
```

然后手动打开 <http://127.0.0.1:3765>。

### 首次运行

首次启动时，应用会自动在项目目录下创建 `data/`、本地 SQLite 数据库和初始 Developer Memory 工作区。它只监听 `127.0.0.1`，默认不会把数据上传到云端。

建议按这个顺序体验：

1. 在“项目记忆”中建立或编辑一个项目，并填写它的本地目录。
2. 在“数据源”中手动扫描 Folder、Git 或项目指令文件。
3. 创建一条决策或约束，试用关键词检索和精简上下文。
4. 在“Agent 连接”中先运行 MCP 自检，再连接一个 Coding Agent。
5. 让 Agent 提交一条记忆候选，到“权限与审计”中批准或拒绝。
6. 立即断开该 Agent，验证独立凭证撤销流程。
7. 在设置中创建并验证一份完整备份。

应用内的“产品说明书”提供更完整的页面级操作指导，也可以在服务运行后直接打开 <http://127.0.0.1:3765/product-guide.html>。

## 连接 Coding Agent

1. 保持 Memory AI Local 正在运行。
2. 打开网页中的“Agent 连接”。
3. 选择 Codex、Claude Code 或 Antigravity，点击“查看连接步骤”。
4. 复制网页为该客户端生成的专属 MCP 配置与凭证。
5. 将配置加入对应客户端并重启客户端。
6. 确认出现上方列出的 8 个 `memory-ai-local` 工具。
7. 回到网页配置项目权限；不再使用时可以立即断开。

仓库中的 `mcp-config.example.json` 仅用于展示配置结构。**请不要使用其中的占位凭证，也不要把网页生成的真实凭证提交到 Git。** 非 Windows 用户需要在 MCP 配置中使用本机的绝对路径。

更详细的规则参见 [`MCP 使用说明.txt`](./MCP%20%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.txt)。

## 数据源与扫描边界

Memory AI Local 不会监控整台电脑，也不会自动读取 Coding Agent 的私有聊天历史。它只在用户点击扫描后，读取项目“本地目录”所指向的内容。

当前 Folder 扫描遵循以下限制：

- 最大深度 4 层，最多 80 个文件。
- 单文件最多读取 32 KB，总读取量最多 512 KB。
- 跳过 `.env`、疑似密钥与凭证、二进制文件、`node_modules`、`dist`、`build` 和 `data`。
- Git 读取分支、受控状态以及最近 30 条提交，不执行项目代码或 Git Hook。

扫描是一种受限、只读、由用户触发的导入流程，不是后台文件监控服务。

## 本地数据与备份

运行产生的数据默认位于：

```text
data/
├── memory-ai.db          # Developer 与 Life 的本地 SQLite 数据表
├── mcp-credentials.json  # 每个 MCP 客户端的本地凭证
├── life-media/           # Life Memory 媒体副本
└── backups/              # 完整备份目录与校验清单
```

这些内容包含真实个人数据，已经被设计为不进入 Git。分享问题或提交 Issue 时，**不要附带整个 `data/` 目录、数据库、媒体或 MCP 凭证**。

完整备份会复制 Developer 索引、Life 索引与媒体文件，并生成 SHA-256 清单。恢复操作会先验证清单，再创建恢复前安全备份。仅导出 JSON 不包含 Life 媒体二进制；跨机器迁移应优先使用完整备份目录或复制整个 `data/` 文件夹。

## 隐私与安全边界

已实现的保护：

- 服务默认只绑定 `127.0.0.1`。
- MCP 客户端使用独立凭证，可分别授权并立即撤销。
- 敏感记忆默认在 SQL 查询层对 Agent 隐藏。
- Agent 写入记忆和任务必须经过本地用户审批。
- MCP 不定义任何 Life Memory 工具。
- 项目扫描跳过常见密钥、环境变量、构建产物与大文件。

当前仍需用户承担的安全边界：

- SQLite 数据库、Life 媒体和 MCP 凭证**尚无应用层静态加密**。请使用操作系统账户、BitLocker、FileVault 或可信磁盘加密。
- Life 与 Developer 当前位于同一个 SQLite 文件的不同数据表；现有隔离是产品与接口级隔离，不是物理独立的加密保险库。
- 本地 Web API 当前面向单用户回环地址使用，不应把端口转发到局域网或公网。
- 不要在不可信电脑上运行，也不要将 `data/` 同步到未加密的公共网盘或代码仓库。
- 单个 Life 媒体导入上限为 30 MB；部分 Windows 浏览器不能直接预览 HEIC，但应用会保留原文件。

## 当前没有实现

以下项目是明确的产品边界，不应理解为已经可用：

- 向量数据库或语义检索；当前是 SQLite 关键词匹配。
- 自动读取 Codex、Claude Code 或 Antigravity 的完整私有历史。
- ChatGPT / Claude 导出包导入。
- 微信聊天记录抓取或联系人选择导入。
- iPhone 照片库自动监控或无线同步。
- 多设备同步、云托管、账号系统和多人协作。
- 应用层静态加密、物理独立 Life Vault。
- 声音克隆、形象克隆或数字人生成。
- 面向普通用户的一键桌面安装包。

## 路线图（探索中）

路线图代表后续验证方向，不代表已经交付或承诺日期：

- 更清晰的首次使用引导、便携式测试包和桌面封装。
- ChatGPT / Claude 官方导出包的本地解析与可选择导入。
- Coding Agent 会话的显式导入适配器，而非隐式抓取。
- 数据量足够大后，再评估可替换的本地向量检索 Adapter。
- 凭证与敏感字段加密，以及真正物理分离的 Life Vault。
- 在用户明确选择与授权前提下，探索照片和聊天资料导入。

## 测试

项目使用 Node.js 内置测试运行器：

```bash
npm test
```

Windows PowerShell 可使用 `npm.cmd test`。

当前测试覆盖 API、前端关键契约、产品说明书、MCP STDIO 协议、独立授权与敏感记忆过滤、审批写入、EXIF、数据源扫描、备份恢复和常见安全边界。

MCP 还可以在网页“Agent 连接”中运行真实子进程自检。它会验证 8 个工具可见，并确认只读测试客户端不能提交写入。

## 项目结构

```text
Memory AI Local Frontend/
├── index.html / style.css / script.js       # 主应用界面
├── product-guide.*                          # 产品说明书页面
├── life.css / life.js                       # Life Memory 实验界面
├── backend/
│   ├── server.js                            # 本地 HTTP 服务与 API
│   ├── db.js                                # SQLite schema 与初始化
│   ├── service.js                           # Developer Memory 领域逻辑
│   ├── mcp-server.js                        # STDIO MCP Server
│   ├── mcp-auth.js                          # 客户端凭证与项目权限
│   ├── source-service.js                    # 受限项目数据源扫描
│   ├── backup-service.js                    # 备份、校验与恢复
│   └── life-service.js                      # Life Memory 领域逻辑
├── tests/                                   # Node.js 自动测试
├── Start Memory AI.cmd                      # Windows 双击启动
└── data/                                    # 本地运行数据，不应提交
```

## 反馈与贡献

欢迎通过 GitHub Issues 反馈真实试用体验，尤其是：

- 操作系统与 Node.js 版本。
- 从启动到复现问题的最短步骤。
- 浏览器控制台或命令窗口中的错误文字。
- 你使用的 Coding Agent 与 MCP 客户端版本。
- 哪一步让你困惑，以及你原本期待发生什么。

请先搜索是否已有相同问题；提交前务必删除绝对路径、真实记忆、照片、聊天内容、令牌和数据库。较大的功能改动建议先在 Issue 中说明使用场景与数据边界，再提交 Pull Request。

---

**Memory AI Local 1.2.0 · Alpha** — 数据留在本地，Agent 只拿到完成任务所需的最小上下文，长期记忆由用户决定。
