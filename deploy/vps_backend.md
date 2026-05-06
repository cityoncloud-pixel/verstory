# 搬瓦工 VPS 后端部署（Ubuntu 22.04）— `story-api.suenbeya.com`

目标：让 `https://story-api.suenbeya.com/healthz` 返回 200 JSON，用于验证 DNS/Nginx/HTTPS/后端链路。

## 0) 前置条件（DNS）
在 Hostinger DNS 中为 `story-api.suenbeya.com` 添加/修改：
- 记录类型：A
- 指向：你的 VPS 公网 IP

等待解析生效后在本地验证：
```bash
nslookup story-api.suenbeya.com
```

## 1) SSH 登录（建议密钥）
在本地生成密钥（若没有）：
```bash
ssh-keygen -t ed25519
```

把公钥写入 VPS（或在 VPS 面板里添加 SSH key）：
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@<VPS_IP>
```

登录：
```bash
ssh ubuntu@<VPS_IP>
```

## 2) 基础安全（可选但推荐）
```bash
sudo apt update
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 3) 安装 Docker
（使用 Ubuntu 官方仓库的 `docker.io`，简单可靠）
```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
docker version
```

## 4) 上传并启动后端容器
### 方案 A（推荐）：在 VPS 上直接从仓库构建镜像
把本仓库上传到 VPS（任选其一：`git clone`、SCP、rsync）。假设路径为 `~/verstory`：
```bash
cd ~/verstory/apps/api
docker build -t verstory-api:latest .
```

运行（仅绑定到本机回环，给 Nginx 反代）：
```bash
docker run -d --name verstory-api --restart unless-stopped -p 127.0.0.1:8080:8080 verstory-api:latest
curl -fsS http://127.0.0.1:8080/healthz
```

### 方案 B：docker compose
将 `deploy/docker-compose.story-api.yml` 复制到 VPS（例如 `~/verstory/deploy/docker-compose.story-api.yml`），然后：
```bash
cd ~/verstory/deploy
docker compose -f docker-compose.story-api.yml up -d
curl -fsS http://127.0.0.1:8080/healthz
```

## 5) 安装 Nginx
```bash
sudo apt install -y nginx
sudo nginx -t
sudo systemctl enable --now nginx
```

应用站点配置：
```bash
sudo tee /etc/nginx/sites-available/story-api.suenbeya.com >/dev/null <<'EOF'
server {
  listen 80;
  server_name story-api.suenbeya.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/story-api.suenbeya.com /etc/nginx/sites-enabled/story-api.suenbeya.com
sudo nginx -t
sudo systemctl reload nginx
```

HTTP 验收（先确保 80 正常）：
```bash
curl -fsS http://story-api.suenbeya.com/healthz
```

## 6) 签发 HTTPS（Let’s Encrypt）
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d story-api.suenbeya.com
```

HTTPS 验收：
```bash
curl -fsS https://story-api.suenbeya.com/healthz
```

续期检查：
```bash
sudo certbot renew --dry-run
```

## 7) 回滚/停机
停容器：
```bash
docker stop verstory-api
docker rm verstory-api
```

禁用 Nginx 站点：
```bash
sudo rm -f /etc/nginx/sites-enabled/story-api.suenbeya.com
sudo nginx -t
sudo systemctl reload nginx
```

