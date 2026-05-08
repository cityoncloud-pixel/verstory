# Goal

## 1. Intent / 原始意图
把当前 Verstory（口述整理工具 / Oral Story）从“可跑通的技术 demo / 部署”推进到“面向中老年用户可真实使用的最小闭环（M1）”：

**口述 → 录音 → 转写 → 校正 → 整理成文 → 导出保存**

并且严格遵守交互约束：
- 极简操作 / 大按钮 / 高对比
- 单路径推进（不让用户迷路）
- 避免误操作（删除必须有明确确认）
- 主流程保持三步稳定：`录音 → 转写 → 整理`

## 2. Target Outcome / 目标结果
交付一个在生产环境可用的 M1 闭环（Web）：
- 前端（Hostinger）：用户可在浏览器完成 **项目 → 录音（或上传）→ 转写 → 校正 → 整理 → 导出**。
- 后端（Bandwagon VPS）：提供项目/录音/转写/整理相关 API，稳定运行、可观测、错误可解释（缺 key / 不可用 provider 时给清晰错误）。
- 数据存储：录音文件存对象存储（R2/S3），元数据与文本存 Postgres；本地可做轻量缓存但以服务端为准。

## 3. Success Criteria / 成功标准
1) 长辈可独立完成：创建项目 → 开始录音 → 停止 → 回放（每条录音逐条显示）。
2) 可独立完成：对任意一条录音点击“转写”并得到文本；失败可重试且不影响其它录音。
3) 可独立完成：进入“整理”步骤，基于已校正文本生成整理稿（不虚构、不改事实；仅断句、去口头语、结构化）。
4) 可独立完成：导出（下载 Markdown 或复制到剪贴板，至少一种）。
5) 数据一致：录音与文本严格归属到当前项目；删除录音/项目后数据（DB + 对象存储）被清理（允许 best-effort，但需可重试）。
6) 可部署验证：
   - Hostinger 前端可访问并可完成上述闭环。
   - Bandwagon 后端可通过 `/healthz`，并且关键 API 可用且错误可解释。

## 4. Scope / 范围
### In
- 登录/注册（最小可用即可）。
- 项目管理：创建/进入/删除。
- 录音：开始/暂停/停止；上传本地录音；播放；单删/多选批量删除。
- 转写：对单条录音转写；对项目内录音“转写全部”（逐条容错）。
- 校正：在“转写结果”上可编辑保存（保存为该录音的“校正稿”）。
- 整理成文：基于“校正后的合并文本”生成整理稿；提供最少 2 种输出风格（如：口述整理/回忆录）。
- 导出：Markdown 下载或复制。
- 后端部署：Bandwagon VPS；前端部署：Hostinger。

### Out
- 多用户协作、跨设备同步策略（M1 不做复杂同步冲突处理）。
- 说话人分离、自动章节、时间线、人物识别（M2）。
- 计费/配额/审计与合规模块。

## 5. Constraints / 约束
- Web：大字号/大按钮/高对比；“单页面只做一件事”。
- 录音文件不落本地仓库；对象存储保存，DB 存引用；删除有确认且可恢复提示。
- API 错误必须可解释（面向普通用户的文案 + 面向开发的 error.code）。

### “尊重原意”不可变规则（MVP 至少体现在生成指令与 UI 提示）
- 禁止虚构：不得添加录音/转写中未出现的新事实、人物、时间地点、经历。
- 禁止改事实：不得将不确定表述改成确定结论；不得替用户下判断或编造动机。
- 允许的编辑：断句、去口头语/重复、语病修正、代词指代澄清（不改变含义）、段落结构重排以提升可读性。
- 风格保留：尽量保留第一人称叙述与原本语气；不做“文学化夸张改写”。

## 6. Inputs / 输入材料
- Existing files / repo: UNKNOWN（假设允许在现有仓库中新增/改造前端工程；若仓库已存在固定技术栈，以其为准，见 `assumptions.md` A-0001）。
- References: `project_control/.ggs/idea.md`（需求描述与原则）；`project_control/.ggs/templates/goal.schema.md`（Hard Gates）。

## 7. Output Format / 输出格式
- Required artifacts (files/modules/docs):
  - 可运行的 Web 应用代码（含页面与核心逻辑模块）。
  - `TranscriptionProvider` 与 `StoryPolishProvider`（或等价命名）的接口与默认实现（mock 实现必须可用）。
  - 本地存储层（项目/片段/文本的读写与迁移策略，最少可恢复）。
  - 最小使用说明（README 或应用内说明）与验收步骤（如何启动、如何完成一次录音→转写→生成故事→导出）。

## 8. Risks / 风险
- Unknowns / decisions needed:
  - 转写与整理的真实 provider 选择（本地离线 vs 云端 API）、隐私与成本要求未定（见 `idea.md` Q&A）。
  - iPadOS Safari 对录音/后台行为的限制可能导致功能差异，需要单独兼容策略。
  - “尊重原意”的可配置边界与可审计性需求未定，可能影响产品体验与实现复杂度。

## 9. Execution Handoff / 给 GAEH 的执行指令
recommended_route:
 - Spec -> Plan -> Review -> Execute（先对齐交互规格与数据闭环，再补齐部署与验收）

seed_tasks:
 - 目标对齐：根据 `oral_story_interaction_spec_v1.md` 完成信息架构与主流程约束落地。
 - 前端：三步主流程（录音/转写/整理）+ 校正与导出；极简按钮与防误删。
 - 后端：项目/录音/转写/整理 API 完整闭环；对象存储与 DB 一致性清理。
 - 数据库：补齐“校正稿/整理稿”的版本与归属（绑定 project + recording）。
 - 部署：Hostinger 前端文档与构建产物通过 GitHub 更新；Bandwagon 后端用 SSH 发布更新。

spec_outline:
 - 系统架构：前端/后端/DB/对象存储/鉴权与权限边界。
 - 前端页面：登录/项目列表/项目工作台（录音-tab、转写-tab、整理-tab）。
 - 后端 API：projects/recordings/stt/transcripts/rewrite/export。
 - DB schema：projects、recordings、transcripts、rewrites（+ correction 与 derived 文档）。
 - 状态管理：按“单路径推进”的状态机与 UI 状态映射。

verification_plan:
 - 本地：`npm --prefix apps/api run build` + `npm --prefix apps/web run build`。
 - 流程：创建项目 → 录音 2 条 → 转写全部 → 校正保存 → 整理成文 → 导出。
 - 删除：单删与批量删录音；删除项目；验证 DB + 对象存储清理。
 - 部署：前端 Hostinger 可访问；后端 Bandwagon `/healthz` 与关键 API 可用。
