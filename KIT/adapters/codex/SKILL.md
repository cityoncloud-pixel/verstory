# GAEH (Codex Adapter)

GAEH 是一套「目标驱动的工程协作协议 + 目录骨架 + 状态文件」，用于让 Codex 在新项目中稳定按同一套工程规范推进。

## Role Boundary

- Owner（你）定义：目标、范围边界、验收标准、取舍偏好。
- AI（Codex）负责：任务拆解、设计与实现、验证、审查、落盘与状态同步。
- AI 不得替 Owner 做产品取舍；遇到不确定取舍必须先问清楚。

## Required Project Files (GAEH State)

GAEH 依赖项目根目录下的这些状态文件与目录（由 `gaeh-bootstrap.ps1` / `gaeh init` 生成）：

- `project_control/goal.md`
- `project_control/phase_status.md`
- `project_control/task_queue.json`
- `project_control/decision_log.md`
- `ai_harness/harness_rules.md`
- `plans/` `reviews/` `reports/`

## Workflow (Default)

### GGS (Goal Generation) First

如果项目包含 `project_control/.ggs/templates/runner.prompt.md`，优先先运行 GGS，把目标编译成高质量 `project_control/goal.md`，再进入 GAEH 执行阶段。

1. 读取 `project_control/goal.md`，若缺少 Goal / Experience / Acceptance，先只问澄清问题。
2. 路由（Tiny Fix / Normal / Spec-first）后，写入或更新 `project_control/task_queue.json`。
3. 必要时生成：
   - `specs/<id>.spec.md`
   - `plans/<id>.plan.md`
4. 实现、运行验证（最小可行的测试/命令），并把结果写入：
   - `reports/<id>.report.md`
5. 进行工程审查要点（安全/回归/可维护性），写入：
   - `reviews/<id>.review.md`
6. 记录关键取舍到 `project_control/decision_log.md`，并更新 `phase_status.md`。

## Interaction Policy

- 你只需要给“目标与验收”，AI 负责工程推进与落盘。
- 任何时候以 `project_control/goal.md` 为最高优先级输入。
- 修改状态文件必须保持 JSON/YAML/Markdown 语法正确且可被后续步骤读取。

## Start Command (Owner)

在 Codex 对话中直接发：

`按 GAEH 流程开始执行当前 goal（读 project_control/goal.md），直到产出可运行结果并写报告。`
