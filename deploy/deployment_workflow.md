# Deployment Workflow (Hostinger Frontend + Bandwagon Backend)

## 0) One rule
Frontend “docs/build artifacts” are updated by **GitHub push**.
Backend files on Bandwagon VPS are updated by **SSH**.

---

## 1) Hostinger frontend (via GitHub)
Assumption: Hostinger is configured to deploy from this GitHub repo (or a specific branch).

Recommended workflow:
1) Build & verify locally:
   - `npm --prefix apps/web run build`
2) Commit changes to `main` (or release branch) and push:
   - `git status`
   - `git add -A`
   - `git commit -m "deploy(web): ..."`
   - `git push origin main`
3) Verify:
   - open the Hostinger site URL
   - smoke test: login → projects → record → transcribe → organize → export

If Hostinger uses a subfolder as document root:
- keep deployment artifacts under a fixed directory (e.g. `apps/web/dist` or `apps/web/build`)
- do not commit zip bundles into the repo

---

## 2) Bandwagon backend (via SSH)

### 2.1 What we need from you (Owner)
- VPS IP / hostname
- SSH username (often `root`)
- SSH port (default `22`)
- Deployment directory on VPS (e.g. `/opt/verstory-api`)
- How the service runs (systemd / pm2 / docker compose)

### 2.2 SSH key setup (recommended)
On your local machine (Windows PowerShell):
1) Generate a key (if you don’t have one):
   - `ssh-keygen -t ed25519 -C "verstory-bandwagon" `
2) Show public key:
   - `type $env:USERPROFILE\\.ssh\\id_ed25519.pub`
3) Add the public key to the VPS:
   - easiest: `ssh-copy-id` (not always available on Windows)
   - manual: SSH with password once, then append the pubkey to:
     - `~/.ssh/authorized_keys`

I can guide you step-by-step once you tell me the VPS host/user/port.

### 2.3 Deployment (generic SSH pull)
Typical pattern (on VPS):
1) `cd /opt/verstory-api`
2) `git pull`
3) `npm ci && npm run build`
4) restart service (systemd/pm2/docker)

---

## 3) When SSH keys are required
If your VPS disallows password login (recommended), you must use SSH keys.
If you need a new key specifically for this server, use the steps in 2.2.

