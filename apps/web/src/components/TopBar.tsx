import { useEffect, useRef } from 'react'

export type TopBarProject = {
  id: string
  name: string
}

type Props = {
  projects: TopBarProject[]
  activeProjectId: string | null
  onChangeProject: (projectId: string) => void
  onOpenMenu: () => void
}

export function TopBar({ projects, activeProjectId, onChangeProject, onOpenMenu }: Props) {
  const selectRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    if (projects.length === 0) return
    if (!activeProjectId) {
      onChangeProject(projects[0].id)
      return
    }
    if (projects.some((p) => p.id === activeProjectId)) return
    onChangeProject(projects[0].id)
  }, [activeProjectId, onChangeProject, projects])

  const active = projects.find((p) => p.id === activeProjectId) ?? null

  return (
    <header className="topbar" role="banner">
      <div className="topbarInner">
        <div className="topbarLeft">
          <select
            ref={selectRef}
            className="select"
            value={activeProjectId ?? ''}
            onChange={(e) => onChangeProject(e.target.value)}
            aria-label="切换项目"
          >
            {projects.length === 0 ? <option value="">暂无项目</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="topbarCenter" aria-label="当前项目">
          <div className="topbarAppName">Verstory</div>
          <div className="topbarTitle">{active ? active.name : '未选择项目'}</div>
        </div>

        <div className="topbarRight">
          <button className="iconBtn" type="button" onClick={onOpenMenu} aria-label="更多菜单">
            ⋮
          </button>
        </div>
      </div>
    </header>
  )
}
