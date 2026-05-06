# Execution Rules (AI-owned)

## Scope Discipline
- 只做 plan 中列出的内容；任何新增工作先更新 plan 并记录 decision_log。

## Safety
- 默认避免破坏性操作；确需执行必须先请求 Owner 决策。

## Reporting
每次执行结束必须写入对应 `reports/*.report.md`：
- Done / Not Done
- Verification result
- Risks / Follow-ups
- Next task suggestion

## Tiny Fix Governance
对于 Route A（Tiny Fix）：
- 允许跳过 spec/plan，但必须：
  - 写 `reports/{task_id}.report.md`
  - 更新 `project_control/task_queue.json`（新增或更新该 task）
  - 追加 `project_control/decision_log.md`（说明改了什么、为什么）
