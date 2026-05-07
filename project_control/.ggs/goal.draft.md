# Goal

## 1. Intent / 原始意图
将 Verstory 从“本地存储 MVP”推进到“可跨设备使用的云端版本”：
用户用邮箱/密码登录后，在网页里创建项目、录音、转写、改写；录音与文本结果都保存到服务器（录音进 Cloudflare R2，对应元数据与文本进 Postgres），在不同设备/浏览器上登录同一账号也能继续编辑与查看历史。
同时优化现有 UI：更美观、适配手机/平板/桌面，并将“转写中 / 改写中”的状态放回各自板块内显示（不再用全局漂浮状态）。

## 2. Target Outcome / 目标结果
交付一个可部署到生产环境的“云端存储版”最小闭环（Phase Cloud-0001）：
- 后端（`https://story-api.suenbeya.com`）：提供登录鉴权、项目/录音/转写/改写的 REST API；使用 Postgres 持久化数据；使用 Cloudflare R2 存储音频；并支持前端通过预签名 URL 直传/直取音频。
- 前端（`https://story.suenbeya.com`）：提供登录页与项目工作台；在桌面/平板/手机下布局自适应；录音、转写、改写各自板块内展示自己的“进行中/失败/完成”状态；支持跨设备刷新后继续。

## 3. Success Criteria / 成功标准
1) 登录可用：仅允许预置用户登录；未登录访问受保护 API 返回 401；支持重置密码（通过 DB 更新或管理员接口，二选一）。
2) 云端录音存储：录音完成后，音频上传至 R2（私有 bucket）；Postgres 中保存 recording 元数据（时长、mime、size、r2_key、createdAt、projectId、userId）。
3) 跨设备验证：在设备 A 录音并上传后，设备 B 登录同一账号能看到项目与录音列表，并能播放该录音（通过短期签名 GET URL 或后端代理流）。
4) 转写/改写状态归位：点击转写时，“转写中”仅显示在转写板块标题栏（Badge + spinner）；点击改写时，“改写中”仅显示在改写板块标题栏；任一失败只影响对应板块并显示错误信息。
5) 响应式可用：桌面（≥1024）、平板（768–1024）、手机（≤768）三档布局均不溢出；关键操作在手机端无需横向滚动即可完成录音→转写→改写。
6) 可验证命令：本地可通过 `npm run dev` 启动前后端并跑通一次完整流程；`npm run build` 成功。

## 4. Scope / 范围
### In
- Postgres 数据库（用户、项目、录音元数据、转写文本、改写文本、任务状态）。
- 云端音频存储：Cloudflare R2 私有 bucket；前端使用预签名 PUT 直传，避免音频穿过 API 服务器。
- 简易登录：邮箱/密码登录；仅预置用户；不开放注册。
- UI 重构：响应式布局 + 卡片化板块（录音/转写/改写）+ 每板块独立状态。
### Out
- 多租户协作、邀请、权限细粒度管理（仅做到“用户只能访问自己的数据”）。
- 计费/配额/审计与合规模块。
- 实时流式转写（本阶段只做录完上传后转写）。

## 5. Constraints / 约束
- 域名：前端 `story.suenbeya.com`，后端 `story-api.suenbeya.com`（跨子域）。登录态以“尽量不复杂”为原则：优先使用 HttpOnly Cookie + `Domain=.suenbeya.com` + `SameSite=Lax`，前端请求使用 `credentials: include`。
- R2：bucket 默认私有，不开启公开访问；只通过短期预签名 URL 访问对象。
- 不在仓库中写入任何密钥；仅通过环境变量配置（示例写进 `.env.example`）。

## 6. Inputs / 输入材料
- Existing repo：当前 `apps/web` 已有录音与本地 IndexedDB 存储实现；`apps/api` 已有 STT/text API 雏形与部署域名。
- Owner-provided config：`DATABASE_URL`（Postgres），以及 R2 的 endpoint/bucket/accessKey/secretKey（仅放环境变量）。

## 7. Output Format / 输出
- 代码：后端鉴权 + Postgres schema/migrations + R2 预签名上传/下载接口；前端登录与响应式 UI。
- 文档：新增/更新部署与本地开发说明（包含必需 env 列表，但不包含真实值）。

## 8. Risks / 风险
- 跨子域 Cookie/CORS 配置不一致导致登录态不稳定（需要在后端 CORS 与前端 fetch 处同时配置 credentials）。
- 音频文件体积与上传失败：需要做基本重试与错误提示。

## 9. Execution Handoff / 执行交接（给 GAEH）
recommended_route:
- Spec -> Plan -> Review -> Execute（先把 Auth + 存储打通，再做 UI 与迁移）。
seed_tasks:
- 设计并落库 Postgres schema（users/projects/recordings/transcripts/rewrites/jobs）。
- 后端：登录（预置用户）+ JWT/refresh cookie；受保护路由中间件。
- 后端：R2 预签名 PUT/GET（按 project/user 生成 r2_key）。
- 前端：登录页 + API client 支持 credentials；工作台 UI 响应式改造；状态归位。
- 可选：本地 IndexedDB 数据迁移到云端的一键迁移按钮（后置）。

