# phase_status.md (Owner-owned)

## Current Phase
Phase 5: Cloud Storage + Auth + Responsive UI

## Phase Goal
将 Verstory 升级为“云端存储版”并可跨设备继续使用：
- 预置用户登录（邮箱/密码），不开放注册
- 录音文件存 Cloudflare R2（私有 bucket，预签名直传/直取）
- 项目/录音元数据/转写/改写/任务状态存 Postgres
- 前端 UI 更美观且适配手机/平板/桌面；“转写中/改写中”状态放入各自板块

## Done Criteria
- 用户登录后能创建项目、录音、上传到 R2，并能在另一设备登录后看到并播放同一录音
- 转写/改写可运行且状态归位（各自板块内显示进行中/失败/完成）
- 必需工程产物完整：`specs/mvp-0006.spec.md`、`plans/mvp-0006.plan.md`、`reviews/mvp-0006.review.md`、`reports/mvp-0006.report.md`
- 本地可验证：`npm run dev` 跑通一次端到端流程；`npm run build` 成功

## Notes
- 生产环境需要配置 `DATABASE_URL` 与 R2/JWT/Cookie 相关环境变量（仅提供变量名，不在仓库中写入真实值）。

## Forbidden Work (Scope Guard)
- 不做多用户协作/邀请/权限细粒度管理
- 不做计费/配额/审计与合规模块
- 不做实时流式转写

