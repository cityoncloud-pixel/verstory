# Assumptions (LLM Best-Effort)

当你回答不了、或信息缺失时，GGS 允许 LLM 给出“最优可执行假设”，但必须全部记录在这里，便于审计与回滚。

格式建议（每条一段）：

## A-0001
- Assumption: 本项目按“从零到一实现可运行 MVP”来定义交付范围（不依赖已有前端/后端实现细节）。
- Rationale: `idea.md` 未提供现有仓库结构与技术栈信息，且需要可落地的执行目标。
- Risk Level: medium
- If wrong, fallback: 若已有代码与栈固定，则将目标调整为“在既有栈中实现同等功能模块”，并优先复用现有工程脚手架与部署方式。

## A-0002
- Assumption: MVP 阶段不做账号体系与跨设备同步；数据仅保存在本地（浏览器存储/本地文件导出）。
- Rationale: 需求重点在录音→转写→整理故事；同步与登录会显著放大范围与风险。
- Risk Level: medium
- If wrong, fallback: 把同步作为 Phase 2，先定义数据模型与导出格式，后续再接入账号/云存储。

## A-0003
- Assumption: 录音采用浏览器端 `MediaRecorder`，支持“多段录音追加到同一项目”，并能回放每段音频。
- Rationale: 这是最通用且可在本地验证的 Web 录音方案。
- Risk Level: low
- If wrong, fallback: 改为 WebAudio + AudioWorklet 录制 PCM/WAV，或在移动端限制下仅支持单段录音。

## A-0004
- Assumption: “转写”和“LLM 整理”作为可插拔 provider；默认提供本地 mock（无外部 API 也能跑通 UI/流程），若提供 API Key 则可切换到真实 provider。
- Rationale: runner 约束不允许调用外部 API，且用户未明确云端/本地模型选择；mock 可保证可验证交付。
- Risk Level: high
- If wrong, fallback: 若必须真实转写/整理，则在目标中明确选择具体服务（例如 OpenAI Whisper/Chat Completions 或本地模型），并补充密钥/费用/隐私要求。

## A-0005
- Assumption: 首个验收环境为桌面端现代 Chromium 浏览器；iPad/平板适配作为后续里程碑。
- Rationale: `idea.md` 提到“后续需支持平板”，暗示 MVP 先在本机验证。
- Risk Level: low
- If wrong, fallback: 立即将兼容性目标提升为 iPadOS Safari，并在录音/文件系统权限方面调整交付策略与测试清单。

## A-0006
- Assumption: 验收以“可观察行为 + 构建成功”为主：能 `npm run dev` 本地启动并走通端到端流程；能 `npm run build` 成功产出。
- Rationale: 未知项目测试体系；以最小可执行验证方式保证可交付。
- Risk Level: medium
- If wrong, fallback: 若已有既定测试命令/CI，则以仓库既有命令替换并补充对应通过条件。
