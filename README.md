# GAEH (Goal-Driven AI Engineering Harness)

这是一个本地工程用的“目标驱动 AI 工程执行骨架”。Owner 只写目标与验收；AI 负责工程分解、实现、验证、纠偏与下一步推进。

## How to start (Owner)
1. 打开并填写：`project_control/goal.md`
2. （可选）补充：`project_control/product_vision.md`
3. 然后对 Codex 说：**“按 GAEH 流程开始执行当前 goal”**

## Governance（小改动也纳入）
- Route A（Tiny Fix）允许不写 spec/plan，但必须写：结果报告 + 最小验证 + 变更记录
- 参考模板：`reports/_tiny_fix_template.report.md`

## Codex / Cursor 操作指令（可直接复制）
- 按 GAEH 流程开始执行当前 goal（读 `project_control/goal.md`），直到产出可运行结果并写报告
- 我已经写好 goal.md，请按 GAEH 进行分类路由、拆任务、执行、验证，并把每一步落盘到 task_queue/decision_log/reports

## Verstory 存储说明（重要）
Verstory 的“音频/文本”分别存放在不同系统中：

- 录音文件（音频本体）：存 Cloudflare R2（bucket `verstory`）
- 录音元数据 + 转写草稿（draft）+ 故事最终稿（final）：存 Postgres（Supabase）

也就是说：**R2 里只放音频文件；转写/改写后的文本不在 R2，而在 Postgres**。

详见：`apps/web/README.md`
