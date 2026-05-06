# Phase 4 上线/更新 Runbook（AI 后端 + 模型可选）

## 1) 后端（VPS）
后端目录：`/root/verstory/apps/api`

### 1.1 设置 API Keys（推荐用 env-file）
在 VPS 上创建文件：
```bash
sudo mkdir -p /etc/verstory
sudo tee /etc/verstory/api.env >/dev/null <<'EOF'
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DOUBAO_API_KEY=
HOST=0.0.0.0
PORT=8080
EOF
sudo chmod 600 /etc/verstory/api.env
```

### 1.2 构建镜像并重启容器
```bash
cd /root/verstory/apps/api
docker build -t verstory-api:latest .
docker stop verstory-api || true
docker rm verstory-api || true
docker run -d \
  --name verstory-api \
  --restart unless-stopped \
  --env-file /etc/verstory/api.env \
  -p 127.0.0.1:8080:8080 \
  verstory-api:latest
```

### 1.3 验收（后端）
```bash
curl -fsS https://story-api.suenbeya.com/healthz
curl -fsS https://story-api.suenbeya.com/api/models
curl -fsS https://story-api.suenbeya.com/api/config/check
```

> 没有 key 时：`/api/config/check` 会显示 `ready=false`，前端调用 STT/refine 会返回 `MISSING_API_KEY`。

## 2) 前端（Hostinger）
前端目录：`apps/web`

### 2.1 本地构建
```bash
cd apps/web
npm install
npm run build
```

构建产物：`apps/web/dist/`

### 2.2 上传
按 `deploy/hostinger_frontend.md` 把 `dist/` 内容上传到 `story.suenbeya.com` 的站点根目录。

## 3) 端到端验收（浏览器）
1) 打开 `https://story.suenbeya.com`
2) 新建项目 → 录音一段 → 选择该段用于转写
3) 选择 STT provider/model → 点击“转写（API）”
4) 选择 Text provider/model + mode → 点击“整理（API）”
5) 导出 Markdown
