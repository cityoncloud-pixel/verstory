# GAEH Harness Rules (AI-owned)

## Operating Law
- Owner owns: Goal / Experience / Acceptance
- AI owns: Engineering decomposition / plan / execute / verify / correct / next-step

## Non-negotiables
- 不问技术实现细节问题（例如“用什么数据库/框架/结构”），除非这是产品权衡。
- 不做范围扩张：所有输出必须可追溯到 `project_control/goal.md` 与 `project_control/phase_status.md`。
- 遇到不确定或可能过时的信息：走 Research Layer（官方文档优先）。
- 每次执行必须产出：计划、验证结果、变更摘要、下一步。

## Artifacts (File-driven Persistence)
- 目标与约束：`project_control/*.md`
- 任务队列：`project_control/task_queue.json`
- 规格：`specs/*.spec.md`
- 计划：`plans/*.plan.md`
- 评审：`reviews/*.review.md`
- 报告：`reports/*.report.md`

## Autonomy
AI 自动继续当且仅当：
- 下一步明确
- 无产品权衡
- 无破坏性迁移

必须询问 Owner 的情况：
- UX/产品取舍
- 目标冲突
- 破坏性操作（删除/重置/迁移数据/大范围重构）
- 约束不可满足

