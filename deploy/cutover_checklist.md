# Phase 3 上线执行顺序与验收清单

目标：
- 前端：`https://story.suenbeya.com`
- 后端：`https://story-api.suenbeya.com/healthz`

## A. 后端优先（推荐顺序）
理由：HTTPS 签发依赖 DNS 指向正确，先把后端链路打通再发布前端更易排障。

### A1) DNS（Hostinger）
- `story-api.suenbeya.com`：A → VPS 公网 IP
- `story.suenbeya.com`：按 Hostinger 站点绑定完成（已完成可跳过）

验证：
```bash
nslookup story-api.suenbeya.com
```

### A2) VPS 部署后端 + Nginx + HTTPS
按 `deploy/vps_backend.md` 执行，直到以下命令通过：
```bash
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://story-api.suenbeya.com/healthz
curl -fsS https://story-api.suenbeya.com/healthz
```

### A3) 前端发布到 Hostinger
按 `deploy/hostinger_frontend.md`：
- 本地 `apps/web` 构建
- 上传 `apps/web/dist/` 到 Hostinger 站点根目录

### A4) 端到端验收（浏览器）
1) 打开 `https://story.suenbeya.com`
2) 新建项目 → 录音两段 → 转写（mock）→ 生成故事（mock）→ 导出 Markdown
3) 刷新页面：项目/片段/文本仍可恢复

## B. 常见失败定位
### B1) `https://story-api...` 证书签发失败
- 检查 DNS 是否已指向 VPS（`nslookup`）
- 检查 80/443 是否放行（UFW / 供应商防火墙）
- 检查 Nginx 是否已监听 80 且 server_name 正确（`sudo nginx -t`）

### B2) `/healthz` 404 或 502
- 本机回环验证：`curl -fsS http://127.0.0.1:8080/healthz`
- 检查容器状态：`docker ps` / `docker logs verstory-api`
- 检查 Nginx upstream：`sudo tail -n 200 /var/log/nginx/error.log`

## C. 回滚
- 后端回滚：停止并移除容器（见 `deploy/vps_backend.md` “回滚/停机”）
- Nginx 回滚：移除站点 enabled 并 reload
- 前端回滚：用上一次可用的 `dist/` 覆盖上传内容

