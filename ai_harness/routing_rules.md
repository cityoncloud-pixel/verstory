# Routing Rules (AI-owned)

## Route A — Tiny Fix
Criteria:
- 单文件、UI 文本/样式、孤立 bug
Flow:
- Goal → Plan → Execute → Verify

### Governance (Tiny Fix 也纳入治理)
Route A 允许不写 spec/plan，但必须最少产出与落盘：
- `reports/{task_id}.report.md`：结果报告（含验证结果）
- `project_control/decision_log.md`：记录更改动作与原因
- `project_control/task_queue.json`：登记 task（artifacts 只要求 report，其余可为 null）

Verify 最小门槛：
- 功能路径可手动复验（写在 report）
- 若涉及数据/文件：必须验证“写入/读取/删除”至少 1 次

## Route B — Normal Task
Criteria:
- 本地功能、UI + 状态、简单 API
Flow:
- Goal → Task Spec → Plan → Execute → Verify

## Route C — Architecture Task
Criteria:
- schema/backend/storage/cross-module
Flow:
- Goal → Full Spec → Review → Plan → Review → Execute → Verify

## Route D — Phase Task
Criteria:
- 大系统/子系统/多依赖任务
Flow:
- Goal → Phase Spec → Task Queue → Iterative execution
