# Command List (GAEH + GGS)

本文件用于集中列出你在后续执行 GGS（Goal Generation System）与 GAEH（执行落地）时需要用到的“命令/指令”。

> 约定：
> - “PowerShell 命令”在系统终端执行（Windows）。
> - “Codex/Cursor 指令”在 Codex 或 Cursor 的对话输入框执行（一次一条）。

---

## 0) 解压安装包

把 `gaeh_package.zip` 解压到任意目录，例如：

- `<KIT>` = `D:\tools\gaeh_kit`

---

## 1)（可选）全局安装 GAEH Kit（一次性）

在 `<KIT>` 目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\gaeh.ps1 install
```

然后（可选）把 shim 加到当前会话 PATH：

```powershell
$env:PATH = "$env:USERPROFILE\.gaeh\bin;$env:PATH"
```

验证 shim 是否可用：

```powershell
powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\.gaeh\bin\gaeh.ps1 doctor -TargetPath .
```

---

## 2) 初始化一个新项目（GAEH 骨架 + 适配器 + GGS）

### 2.1 用 kit 目录直接初始化（不需要全局安装）

在 `<KIT>` 目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\gaeh-bootstrap.ps1 -TargetPath <PROJECT> -Adapters codex,cursor
```

### 2.2 用全局 shim 初始化（推荐）

```powershell
powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\.gaeh\bin\gaeh.ps1 init -TargetPath <PROJECT> -Adapters codex,cursor
```

> 说明：
> - `<PROJECT>` 是你的项目根目录路径。
> - `-Adapters` 可选值：`codex`、`cursor`、或 `codex,cursor`。

---

## 3) 安装/结构校验（GAEH Doctor）

```powershell
powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\.gaeh\bin\gaeh.ps1 doctor -TargetPath <PROJECT>
```

（不使用全局 shim 时）

```powershell
powershell -ExecutionPolicy Bypass -File <KIT>\gaeh-doctor.ps1 -TargetPath <PROJECT>
```

---

## 4) GGS：一条指令跑到底（目标生成）

### 4.1 先填想法（文件输入）

编辑并填写：

- `<PROJECT>\project_control\.ggs\idea.md`

### 4.2 Codex/Cursor 指令（单入口 Runner）

把下面这条指令发给 Codex 或 Cursor（只发一次）：

> 请作为 GGS（Goal Generation System）运行，并严格按 `project_control/.ggs/templates/runner.prompt.md` 执行：只读写该 prompt 指定的文件，自动完成“澄清 → 起草 → 结构化评审 → 自动修订循环 → 导出”，最终生成可供 GAEH 消费的 `project_control/goal.md`，并生成 `project_control/.ggs/goal.review.json`。

执行完成后，你应当得到：

- `<PROJECT>\project_control\goal.md`
- `<PROJECT>\project_control\.ggs\goal.review.json`

---

## 5) GAEH：从 goal 到代码落地（执行阶段）

在 Codex/Cursor 里发下面任意一条（推荐第一条）：

1)
> 按 GAEH 流程开始执行当前 goal（读 `project_control/goal.md`，可参考 `project_control/.ggs/goal.review.json` 的 handoff），直到产出可运行结果并把过程落盘到 `plans/`、`reviews/`、`reports/`，同时更新 `project_control/task_queue.json` 与 `project_control/decision_log.md`。

2)
> 我已经确认 `project_control/goal.md`，请按 GAEH 进行路由、拆任务、实现、验证与审查，并把每一步落盘到对应目录与状态文件。

