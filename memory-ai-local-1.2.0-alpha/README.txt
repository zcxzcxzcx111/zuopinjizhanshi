Memory AI Local 1.2
===================

这是一个运行在本机的 Developer Memory + Life Memory 应用。Developer Memory 为多个 Coding Agent 保存可追溯的项目决策、偏好、任务和交接上下文；Life Memory 单独管理人物、照片、Live Photo 与故事，不提供给 Coding Agent。

启动
1. 双击“Start Memory AI.cmd”。
2. 浏览器会自动打开 http://127.0.0.1:3765 。
3. 使用期间保持命令窗口开启；关闭窗口即停止本地服务。
4. 完整产品介绍与操作说明：打开 product-guide.html，或在主界面点击“产品说明书”。

本次版本可用功能
- 项目、开发记忆、敏感标记、任务、关键词搜索、Token 预算、增量变化和 Agent 交接包。
- Codex、Claude Code、Antigravity 各自独立的 MCP 本地凭证、项目权限与立即断开。
- 8 个 MCP 工具；记忆/任务写回只生成候选，用户在网页批准后才落库。
- 真实 STDIO MCP 子进程自检，并验证只读自检客户端不能提交写入。
- 手动扫描项目文件夹、Git 最近 30 条提交、AGENTS.md / CLAUDE.md / SKILL.md；扫描不会执行项目代码或 Hook。
- 数据源跳过 .env、密钥、疑似凭证、二进制、node_modules、dist、build 和 data，并限制深度、数量与字节。
- 完整本地备份目录：manifest 校验、Developer JSON、Life JSON 与媒体文件；恢复前自动创建安全备份并保留恢复前媒体副本。
- Life Memory：人物、照片/视频、JPEG EXIF、HEIC 原文件、同名照片+MOV 的 Live Photo 配对、时间线和本地故事草稿。
- 桌面和手机响应式布局。

数据位置
- SQLite：data\memory-ai.db
- Life 媒体副本：data\life-media
- MCP 本地凭证：data\mcp-credentials.json
- 完整备份：data\backups\backup-...
- 默认只监听 127.0.0.1，不上传云端。

数据源规则
- 只读取项目“本地目录”字段指向的文件夹；不会监控整台电脑。
- Folder：README、Markdown、文本和常见包/构建配置；最大深度 4、最多 80 个文件、单文件 32 KB、总计 512 KB。
- Git：使用参数化 git 命令只读分支、受控 status 和最近 30 条提交，不运行 Hook。
- 扫描内容先保存到本地 source_items，并生成审批候选；批准前不会进入长期记忆。

备份与恢复
- 设置页“创建完整备份”会复制索引和媒体并写入 SHA-256 清单。
- “验证并恢复”需要再次点击确认；验证失败不会改动当前数据。
- 恢复前会自动创建一份 safety backup；恢复完成后，旧媒体目录也会保留为 life-media.before-restore...。
- JSON 索引导出不包含 Life 媒体二进制；跨机器迁移优先使用完整备份目录或复制整个 data 文件夹。

开发与测试
- 启动：node --no-warnings=ExperimentalWarning backend\server.js
- 全部测试：npm test
- MCP 服务：node --no-warnings=ExperimentalWarning backend\mcp-server.js（通常由 Agent 使用配置启动）
- MCP 说明：MCP 使用说明.txt

已知边界
- SQLite 数据库与凭证文件目前没有应用层静态加密；请使用 Windows 账户、BitLocker/设备加密和可信磁盘保护。
- 搜索是 SQLite 关键词匹配，尚未使用向量或语义检索。
- 不会自动读取 Codex、Claude Code 或 Antigravity 的私有历史；现有 Agent 需主动调用 MCP。
- 不支持微信聊天抓取、ChatGPT/Claude 导出包导入、iPhone 照片库自动监控、声音或形象克隆。
- Life 与 Developer 目前是同一个 SQLite 文件中的不同数据表，并非物理独立加密保险库；MCP 代码层完全不提供 Life 工具。
- 单个 Life 媒体导入上限 30 MB；HEIC 在部分 Windows 浏览器无法预览，但原文件会保留。
