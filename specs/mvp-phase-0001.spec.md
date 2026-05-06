# Spec: mvp-phase-0001 — Phase 2 MVP Web App

## Goal Alignment
本 Phase 以 `project_control/goal.md` 为唯一目标输入，交付一个本机可运行的 Web 应用 MVP，满足 Success Criteria（录音分段、mock 转写、mock 整理、持久化、导出、build/dev 验收）。

## Scope (Phase 2)
### In
- 新增前端工程目录与最小可运行应用（默认采用 Vite + React + TypeScript）
- 单页应用：项目选择/创建、录音片段列表与回放、文本展示（原始转写/故事）、导出
- 本地持久化：保存项目、音频片段（blob）、转写文本、故事文本
- Provider 抽象与 mock 实现：无网络/无密钥也能产出确定性文本

### Out
- 账号/同步/多用户/权限
- 真实转写/真实 LLM（作为后续可插拔扩展）
- iPadOS Safari 生产级兼容性保证（仅做架构预留与风险提示）

## Key Decisions (Engineering-owned)
- 前端框架：Vite + React + TS（快速产出、易验证）
- 存储：IndexedDB（持久化 blob 与结构化数据）
- 录音：MediaRecorder（浏览器原生）
- Provider：接口抽象 + 默认 mock；未来可替换为真实 provider

## Data Model (MVP)
- Project: `{ id, name, createdAt, updatedAt }`
- RecordingSegment: `{ id, projectId, createdAt, durationMs, mimeType, blob }`
- Transcript: `{ projectId, segments: [{ segmentId, text }], mergedText, updatedAt, providerId }`
- Story: `{ projectId, text, updatedAt, providerId, rulesSummary }`

## UX Outline (Single Page)
- 左侧：项目列表（创建/选择/删除可选，MVP 允许只创建+选择）
- 中间：录音区（开始/停止/继续）+ 片段列表（回放/删除）
- 右侧：文本区（原始转写 / 故事，按钮：转写 / 生成故事 / 导出）
- 顶部：状态提示（录音中、转写中、生成中、错误等）

## Verification (Phase-level)
- 开发启动：`npm run dev` 启动后可手工走通端到端流程（录两段→转写→生成故事→刷新恢复→导出）
- 构建：`npm run build` 成功
- Mock 约束：无网络/无密钥情况下也能得到确定性转写与故事文本（用于验收与回归）

