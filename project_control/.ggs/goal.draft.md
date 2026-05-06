# Goal

## 1. Intent / 原始意图
构建一个“口述自传式故事记录与整理”的网页应用 MVP：用户在浏览器里创建项目、分段录音并保存；系统将音频转写为文字，并在“尊重原意、不虚构不改动事实”的前提下，对口述文本做轻度整理（去口头语/断句/重复、改善顺序与结构），生成更通顺连贯的故事文本；用户可查看原始转写与整理后故事，并继续追加录音与再次整理。

## 2. Target Outcome / 目标结果
在本机环境可运行的 Web 应用 MVP（本地启动即可使用），实现端到端流程：项目管理 → 分段录音 → 保存/回放 → 转写（可先 mock）→ 故事整理生成（可先 mock）→ 持久化 → 导出故事文本（Markdown）。

## 3. Success Criteria / 成功标准
1) 可观察行为：在浏览器中创建一个项目后，完成至少 2 段录音（开始/停止/继续录音），页面展示录音片段列表（含时长/创建时间），每段可回放。
2) 可观察行为：点击“转写”后，系统为每段音频生成对应转写文本，并给出合并后的“原始转写全文”（MVP 允许使用 mock provider，但必须能跑通端到端 UI/数据流）。
3) 可观察行为：点击“生成故事”后，输出“整理后故事文本”，并明确声明整理原则（不虚构、不改动事实；仅做必要的语病/断句/去口头语/结构整理）；用户可在页面同时查看原始转写与故事文本。
4) 可观察行为：刷新页面后，已创建项目、录音片段元数据、转写文本与故事文本仍可恢复（本地持久化）。
5) 可观察行为（mock 验收）：在无网络/无密钥情况下，mock provider 仍能生成确定性（可重复）的转写与故事输出（例如基于固定模板/固定伪输入），以保证端到端流程可验收。
6) 可验证命令：项目在本机可通过 `npm run build`（或仓库既定等价构建命令）成功构建产物；并能通过 `npm run dev`（或等价启动命令）启动后完成上述行为验收。（若仓库并非 Node 生态，则在执行阶段替换为实际栈的等价命令。）

## 4. Scope / 范围
### In
- 单用户、本地优先的项目管理：创建/重命名/删除项目（最少创建与选择项目即可）。
- 浏览器端录音与分段追加：开始/停止/继续；片段列表与回放。
- 音频片段与文本的本地持久化（例如 IndexedDB）；可恢复历史项目状态。
- Provider 抽象：转写与整理以可插拔接口实现；默认 mock provider 跑通流程（不依赖外部 API）。
- 故事文本导出（Markdown 文件或复制到剪贴板，至少一种）。

### Out
- 账号登录、权限管理、跨设备同步、多用户协作。
- 生产级实时转写、说话人分离、噪声抑制、复杂编辑器能力（富文本协作/版本对比等）。
- 完整的平板/iPadOS Safari 兼容性保证（作为后续里程碑；MVP 以桌面 Chromium 为主）。
- 付费/计费、配额管理、审计与合规模块。

## 5. Constraints / 约束
- Tech/Platform: Web 应用；录音使用浏览器音频能力（`MediaRecorder`）；本地存储（IndexedDB/LocalStorage）；provider 可选接入云端 API 但 MVP 不强依赖（见 `assumptions.md` A-0004）。
- Time: 以 MVP 可验收为目标，优先端到端跑通与可复用架构，避免过度工程化。
- Tools: 允许在 Codex/Cursor 环境下开发；不强制外部服务依赖；如接云端 API，需通过环境变量/配置注入密钥。
- Style/Architecture: 清晰分层（UI / domain / providers / storage）；provider 接口可替换；坚持“尊重原意”与“不可虚构”原则可配置/可审计（至少在 UI 文案与整理指令中体现）。
- Cost: 默认零外部成本（mock）；如启用云端模型，需可关闭并提示潜在费用。

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
- Spec -> Plan -> Review -> Execute（先 mock 跑通全链路，再可选接真实 provider）

seed_tasks:
- 定义数据模型：Project、RecordingSegment、Transcript、Story（含版本/更新时间）。
- 实现浏览器录音：MediaRecorder 分段录制、片段列表、回放、删除。
- 实现本地持久化：IndexedDB（或等价方案）存储项目/片段元数据与文本结果；刷新恢复。
- 设计 provider 接口与默认 mock：TranscriptionProvider、StoryPolishProvider；mock 输出确定性文本。
- 实现 UI：原始转写与故事并排展示；“转写/生成故事/导出”按钮与状态提示。
- 实现导出：将故事以 Markdown 导出/复制。
- 补齐最小文档与验收步骤。

spec_outline:
- 信息架构：项目列表/项目详情/录音区/文本区/导出区。
- 状态机：idle -> recording -> recorded -> transcribing -> polished -> exported（或等价）。
- 存储 schema：projects、segments、texts（键与索引）。
- provider 接口：输入/输出、错误处理、取消/重试策略。
- 整理规则：不可变禁止项与允许编辑项；展示给用户的提示文案。

verification_plan:
- 启动应用：执行仓库既定启动命令（默认 `npm run dev`）并打开页面。
- 创建项目并录两段音频：开始/停止/继续录音；确认列表可回放。
- 点击转写：确认每段出现转写文本与合并全文（mock 情况下也应有确定性输出）。
- 点击生成故事：确认出现故事文本且声明整理原则；对比原文确认未引入新事实（人工抽查）。
- 刷新页面：确认项目、片段、文本仍可恢复。
- 导出：确认可复制/下载 Markdown。
- 构建：执行仓库既定构建命令（默认 `npm run build`）成功。
