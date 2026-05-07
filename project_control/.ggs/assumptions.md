# Assumptions (LLM Best-Effort)

当 Owner 信息缺失或存在多种实现路径时，GGS 允许给出“最优可执行假设”，但必须在此记录，便于审计与回滚。

## A-0001
- Assumption: 本次工作基于现有仓库增量迭代（`apps/web` + `apps/api`），不推倒重来。
- Rationale: 仓库已上线域名与现有 STT/text API 雏形，复用能显著降低实施风险。
- Risk Level: low
- If wrong, fallback: 若现有结构不适合扩展，则最小化抽取公共模块后再继续。

## A-0002
- Assumption: 当前阶段需要“云端存储 + 跨设备继续”，因此项目/文本/任务状态存 Postgres，音频存 Cloudflare R2；仅允许预置用户登录（不开放注册）。
- Rationale: Owner 明确要求录音/转写/改写存到服务器上，并采用 R2；同时希望登录与使用体验尽量简单。
- Risk Level: medium
- If wrong, fallback: 若短期无法完成完整云端闭环，则先实现登录 + 项目/文本上云，音频临时经后端中转上传，后续再切回预签名直传。

## A-0003
- Assumption: 录音仍使用浏览器端 `MediaRecorder`；录音停止后再上传（不做实时流式上传）。
- Rationale: 这是成本最低、兼容性相对最好的 Web 录音路径，且与“预签名直传”契合。
- Risk Level: low
- If wrong, fallback: 若某些端不稳定，降级为单段录音或使用 WebAudio 录制 WAV（后置）。

## A-0004
- Assumption: 转写与改写仍保留 provider 抽象；可继续支持 mock（本地可验收），并支持真实 provider（需要 key 时由环境变量提供）。
- Rationale: 便于本地开发验收与生产切换，避免强绑定某一家服务。
- Risk Level: medium
- If wrong, fallback: 明确锁定单一 provider 并简化配置（后置决策）。

## A-0005
- Assumption: 响应式以三档断点实现（手机 ≤768、平板 768–1024、桌面 ≥1024），优先保证操作闭环可用而不是像素级一致。
- Rationale: Owner 要求适配手机/平板，同时希望“不复杂但好用”。
- Risk Level: low
- If wrong, fallback: 针对 iPadOS/Safari 单独补兼容策略与测试清单（后置）。

## A-0006
- Assumption: 验收以“可观察行为 + 可验证命令”为主：`npm run dev` 跑通，`npm run build` 成功。
- Rationale: 现阶段不引入复杂 CI/E2E 体系，先交付可运行闭环。
- Risk Level: medium
- If wrong, fallback: 若仓库已有既定测试/CI，则补充对应命令与通过条件。

## A-0007
- Assumption: 前端 `story.suenbeya.com` 与后端 `story-api.suenbeya.com` 使用跨子域 Cookie 维持登录态（HttpOnly + `Domain=.suenbeya.com` + `SameSite=Lax`），前端请求使用 `credentials: include`。
- Rationale: Owner 希望登录态“不要太复杂但好用”，跨子域 Cookie 是最省事的方式（不需要前端长期保存敏感 token）。
- Risk Level: medium
- If wrong, fallback: 若浏览器环境导致 Cookie 不稳定，则退回到 Authorization Bearer access token（短期）并降低“免登录”预期。

