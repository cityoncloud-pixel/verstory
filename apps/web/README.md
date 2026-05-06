# Verstory (MVP Web App)

目标：在本机环境完成口述故事记录的最小闭环：项目 → 分段录音 → mock 转写 → mock 故事整理 → 刷新恢复 → 导出 Markdown。

## 运行环境
- Node.js（建议 >= 20）

## 安装与启动
```bash
cd apps/web
npm install
npm run dev
```

## 构建
```bash
cd apps/web
npm run build
```

## 端到端验收（手工）
1) 打开页面后点击“新建项目”
2) 录音两段：
   - 点击“开始录音”→ 讲话 → “停止并保存”
   - 点击“继续录音”→ 讲话 → “停止并保存”
3) 片段列表应出现两段音频，可回放
4) 点击“转写（mock）”生成原始转写全文
5) 点击“生成故事（mock）”生成整理后故事（含整理原则）
6) 点击“导出 Markdown”下载 `.md` 文件；或点击“复制 Markdown”
7) 刷新页面：项目/片段/文本仍可恢复

## 已知限制
- 转写/整理目前为 mock（离线确定性输出），不代表真实语音识别与 LLM 效果
- `MediaRecorder` 的音频格式支持与浏览器有关；若录音失败请换用现代 Chromium 浏览器再试

