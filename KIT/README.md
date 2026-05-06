# GAEH Package

这个文件包用于在任意新项目里“零启动”落地 GAEH 治理骨架（含 Tiny Fix 治理规则）。

## Contents
- `GAEH_Implementation_Spec.md`：原始规范初稿（参考用）
- `gaeh-bootstrap.ps1`：一键生成骨架
- `templates/`：完备的初始骨架模板（不带任何具体项目内容）

## Usage
在 PowerShell 里执行（建议在目标项目根目录运行）：

- 方式 A（在当前目录落地）：`powershell -ExecutionPolicy Bypass -File .\\gaeh-bootstrap.ps1`
- 方式 B（指定目录落地）：`powershell -ExecutionPolicy Bypass -File .\\gaeh-bootstrap.ps1 -TargetPath D:\\01_project\\your-project`

默认行为：
- 仅创建缺失文件；已存在文件不覆盖（避免污染已有项目）

若你要强制覆盖模板文件（谨慎使用）：
- `powershell -ExecutionPolicy Bypass -File .\\gaeh-bootstrap.ps1 -Force`

## Goal Generation (GGS)
此安装包内置了一个上游目标生成器（GGS），用于把你的想法编译成高质量 `project_control/goal.md`，再交给 GAEH 执行。

初始化后你会看到：

- `project_control/.ggs/`：GGS 状态与模板
- `project_control/.ggs/templates/runner.prompt.md`：单入口 Runner Prompt（粘贴执行一次即可）

使用方式（只需一次指令，不需要多命令串联）：

1) 打开并填写：`project_control/.ggs/idea.md`
2) 把 `project_control/.ggs/templates/runner.prompt.md` 的全文粘贴给 Codex/Cursor 执行

它会自动进行：澄清 → 起草 → 评审 → 修订循环 → 导出 `project_control/goal.md`，并生成结构化 `project_control/.ggs/goal.review.json` 作为后续 Spec/Plan 的输入基础。

## How to drive in Codex / Cursor
你只需要写“目标与验收”，工程拆解、检查、验证、审查与落盘由流程负责。

### Step 1 (Owner): 填写目标
先填写：`project_control\\goal.md`

### Step 2 (Owner): 在 Codex/Cursor 里下达操作指令
把下面任意一句直接发给 Codex/Cursor（推荐第一句）：

- `按 GAEH 流程开始执行当前 goal（读取 project_control/goal.md），直到产出可运行结果并写报告。`
- `我已经写好 goal.md，请按 GAEH 进行分类路由、拆任务、执行、验证，并把每一步落盘到 task_queue/decision_log/reports。`

### What will happen (AI)
- 若 `goal.md` 不完整：AI 只会要求补齐 Goal/Experience/Acceptance（只问产品取舍，不问实现细节）
- 一旦目标清晰：AI 自动完成 路由→（必要时 spec/plan）→实现→验证→写 `reports\\` 并更新 `project_control\\task_queue.json` 与 `project_control\\decision_log.md`
