# Plan: mvp-phase-0001 — Phase 2 MVP Web App

## Deliverables
- `specs/mvp-phase-0001.spec.md`
- `plans/mvp-phase-0001.plan.md`
- `reviews/mvp-phase-0001.review.md`
- `reports/mvp-phase-0001.report.md`
- `project_control/task_queue.json` 已包含 Phase 2 任务分解

## Execution Order (Task Queue)
1) `mvp-0001`：脚手架 + 基础页面骨架 + 最小状态（可启动/可构建）
2) `mvp-0002`：录音与 IndexedDB 存储（片段 blob 持久化 + 刷新恢复）
3) `mvp-0003`：mock providers（转写/整理，确定性输出）
4) `mvp-0004`：UI 串联 + Markdown 导出
5) `mvp-0005`：验证与最小文档（README/使用说明），补齐 report/review

## Validation Strategy (Per-task)
- 每个 task 结束必须：
  - 更新 `project_control/task_queue.json` 状态
  - 写 `reports/<id>.report.md`（包含验证结果 PASS/FAIL）
  - 写 `reviews/<id>.review.md`（Diff gate）
- Phase 完成时额外写入 `project_control/recent_reports.md` 摘要与 `project_control/decision_log.md` 关键决策记录

