export type WorkflowTab = 'record' | 'stt' | 'draft'

type Props = {
  activeTab: WorkflowTab
  onChangeTab: (tab: WorkflowTab) => void
}

export function BottomWorkflowTabs({ activeTab, onChangeTab }: Props) {
  return (
    <nav className="bottomTabs" aria-label="工作流">
      <div className="bottomTabsInner">
        <button className={'bottomTab' + (activeTab === 'record' ? ' active' : '')} type="button" onClick={() => onChangeTab('record')}>
          录音
        </button>
        <button className={'bottomTab' + (activeTab === 'stt' ? ' active' : '')} type="button" onClick={() => onChangeTab('stt')}>
          转写
        </button>
        <button className={'bottomTab' + (activeTab === 'draft' ? ' active' : '')} type="button" onClick={() => onChangeTab('draft')}>
          整理稿
        </button>
      </div>
    </nav>
  )
}

