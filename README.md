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
- 按 GAEH 流程开始执行当前 goal（读取 project_control/goal.md），直到产出可运行结果并写报告。
- 我已经写好 goal.md，请按 GAEH 进行分类路由、拆任务、执行、验证，并把每一步落盘到 task_queue/decision_log/reports。
