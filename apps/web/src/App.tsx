import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { AudioPlayer } from './AudioPlayer'
import { RecordingWaveform } from './RecordingWaveform'
import {
  bulkDeleteRecordings,
  completeRecording,
  createProjectApi,
  deleteProjectApi,
  deleteRecording,
  fetchModels,
  getRecordingBlob,
  getMergedCorrection,
  getProjectTexts,
  initRecordingUpload,
  listProjectsApi,
  listRecordings,
  login,
  logout,
  rollbackProjectFinal,
  saveRecordingCorrection,
  saveProjectDraft,
  saveProjectFinal,
  setAccessToken,
  sttTranscribe,
  textRefine,
  type ModelsResponse,
  uploadRecordingProxy,
} from './apiClient'
import { clearApiLogs, getApiLogs } from './apiLog'

const LS_ACTIVE_PROJECT_KEY = 'verstory.activeProjectId.v2'
const LS_TRANSCRIPT_PREFIX = 'verstory.transcript.v2.'
const LS_STORY_PREFIX = 'verstory.story.v2.'
const MAX_RECORDING_MS = 5 * 60 * 1000

function shouldUseDirectR2Upload() {
  const v = (import.meta as any).env?.VITE_R2_DIRECT_UPLOAD
  return String(v ?? '').toLowerCase() === 'true'
}

type CloudProject = {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
}

type CloudRecording = {
  id: string
  projectId: string
  createdAt: string
  durationMs?: number | null
  mimeType?: string | null
  sizeBytes?: number | null
  r2Key: string
  transcriptText?: string | null
  transcriptProvider?: string | null
  transcriptModel?: string | null
  correctionText?: string | null
}

function formatDurationMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function getAudioDurationMs(blob: Blob) {
  const url = URL.createObjectURL(blob)
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.src = url
      audio.onloadedmetadata = () => resolve(audio.duration)
      audio.onerror = () => reject(new Error('failed_to_read_audio_metadata'))
    })
    if (!Number.isFinite(duration) || duration <= 0) return 0
    return Math.round(duration * 1000)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function extFromMime(mime: string) {
  const t = (mime || '').toLowerCase()
  if (t.includes('ogg')) return 'ogg'
  if (t.includes('wav')) return 'wav'
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3'
  if (t.includes('mp4') || t.includes('m4a')) return 'm4a'
  return 'webm'
}

function App() {
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authed, setAuthed] = useState(false)

  const [projects, setProjects] = useState<CloudProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem(LS_ACTIVE_PROJECT_KEY))
  const [recordings, setRecordings] = useState<CloudRecording[]>([])
  const [recordingBlobs, setRecordingBlobs] = useState<Record<string, Blob>>({})
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<Record<string, boolean>>({})
  const [recordingSttStatus, setRecordingSttStatus] = useState<Record<string, string>>({})
  const [recordingSttError, setRecordingSttError] = useState<Record<string, string>>({})
  const [openPlayers, setOpenPlayers] = useState<Record<string, boolean>>({})

  const [recordingStatus, setRecordingStatus] = useState<string>('')
  const [recordingError, setRecordingError] = useState<string>('')
  const [sttStatus, setSttStatus] = useState<string>('')
  const [sttError, setSttError] = useState<string>('')
  const [rewriteStatus, setRewriteStatus] = useState<string>('')
  const [rewriteError, setRewriteError] = useState<string>('')

  const [apiLogs, setApiLogs] = useState(() => getApiLogs())
  const [models, setModels] = useState<ModelsResponse | null>(null)
  const [sttProvider, setSttProvider] = useState<string>('openai')
  const [sttModel, setSttModel] = useState<string>('gpt-4o-mini-transcribe')
  const [textProvider, setTextProvider] = useState<string>('deepseek')
  const [textModel, setTextModel] = useState<string>('deepseek-chat')
  const [refineMode, setRefineMode] = useState<'clean' | 'organize' | 'memoir' | 'goal'>('clean')

  const [transcriptText, setTranscriptText] = useState<string>('')
  const [storyText, setStoryText] = useState<string>('')
  const [storyRulesSummary, setStoryRulesSummary] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'stt' | 'rewrite'>('stt')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordingStartedAtRef = useRef<number | null>(null)
  const recordingTickRef = useRef<number | null>(null)
  const recordingStopRef = useRef<number | null>(null)
  const [recordingElapsedMs, setRecordingElapsedMs] = useState<number>(0)

  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) ?? null, [projects, activeProjectId])

  const isRecording = mediaRecorderRef.current != null

  const selectedIds = useMemo(() => Object.keys(selectedRecordingIds).filter((id) => selectedRecordingIds[id]), [selectedRecordingIds])

  function refreshApiLogs() {
    setApiLogs(getApiLogs())
  }

  function clearLocalProjectCache() {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith(LS_TRANSCRIPT_PREFIX) || k.startsWith(LS_STORY_PREFIX) || k === LS_ACTIVE_PROJECT_KEY) keys.push(k)
    }
    for (const k of keys) localStorage.removeItem(k)
    setTranscriptText('')
    setStoryText('')
    setStoryRulesSummary('')
    setActiveProjectId(null)
    setRecordings([])
    setRecordingBlobs({})
    setSelectedRecordingIds({})
    setOpenPlayers({})
  }

  function clearRecordingTimers() {
    if (recordingTickRef.current) window.clearInterval(recordingTickRef.current)
    if (recordingStopRef.current) window.clearTimeout(recordingStopRef.current)
    recordingTickRef.current = null
    recordingStopRef.current = null
  }

  async function loadProjects() {
    const res = (await listProjectsApi()) as any
    refreshApiLogs()
    if (!res?.ok) throw new Error(res?.error?.message ?? 'failed to load projects')
    const list = (res.projects ?? []) as CloudProject[]
    setProjects(list)
    if (!activeProjectId && list.length > 0) setActiveProjectId(list[0].id)
  }

  async function loadRecordings(projectId: string) {
    const res = (await listRecordings(projectId)) as any
    refreshApiLogs()
    if (!res?.ok) throw new Error(res?.error?.message ?? 'failed to load recordings')
    const list = (res.recordings ?? []) as CloudRecording[]
    setRecordings(list)
    setSelectedRecordingIds((prev) => {
      const next: Record<string, boolean> = {}
      for (const r of list) if (prev[r.id]) next[r.id] = true
      return next
    })
  }

  async function loadProjectTexts(projectId: string) {
    const res = (await getProjectTexts(projectId)) as any
    refreshApiLogs()
    if (!res?.ok) throw new Error(res?.error?.message ?? 'failed to load texts')
    setTranscriptText(String(res.draftText ?? ''))
    setStoryText(String(res.finalText ?? ''))
  }

  useEffect(() => {
    ;(async () => {
      // Don't auto-refresh before login; it creates noisy 401s in local dev.
      try {
        await loadProjects()
        setAuthed(true)
      } catch {
        setAuthed(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeProjectId) localStorage.setItem(LS_ACTIVE_PROJECT_KEY, activeProjectId)
    else localStorage.removeItem(LS_ACTIVE_PROJECT_KEY)
  }, [activeProjectId])

  useEffect(() => {
    let cancelled = false
    if (!activeProjectId) {
      setRecordings([])
      setSelectedRecordingIds({})
      return
    }
    ;(async () => {
      try {
        await loadRecordings(activeProjectId)
        await loadProjectTexts(activeProjectId)
      } catch (e: any) {
        if (cancelled) return
        setRecordingError(e?.message ?? String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!activeProjectId) {
      setTranscriptText('')
      setStoryText('')
      setStoryRulesSummary('')
      return
    }
    // Local cache only as fallback for offline/temporary use.
    try {
      const tRaw = localStorage.getItem(LS_TRANSCRIPT_PREFIX + activeProjectId)
      if (!transcriptText && tRaw) setTranscriptText(tRaw)
      const sRaw = localStorage.getItem(LS_STORY_PREFIX + activeProjectId)
      if (!storyText && sRaw) {
        const parsed = JSON.parse(sRaw) as { text?: string; rulesSummary?: string }
        setStoryText(parsed.text ?? '')
        setStoryRulesSummary(parsed.rulesSummary ?? '')
      }
    } catch {
      // ignore
    }
  }, [activeProjectId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetchModels()
      if (cancelled) return
      if (res && typeof res === 'object' && (res as any).ok) {
        const m = res as ModelsResponse
        setModels(m)
        setSttProvider(m.defaults.stt.provider)
        setSttModel(m.defaults.stt.model)
        setTextProvider(m.defaults.text.provider)
        setTextModel(m.defaults.text.model)
      }
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function onLogin() {
    setAuthError('')
    const res = (await login(authEmail, authPassword)) as any
    refreshApiLogs()
    if (!res?.ok) {
      setAuthError(`${res?.error?.code ?? 'ERROR'}: ${res?.error?.message ?? 'login failed'}`)
      return
    }
    setAuthed(true)
    await loadProjects()
  }

  async function onLogout() {
    await logout()
    refreshApiLogs()
    setAuthed(false)
    setProjects([])
    setRecordings([])
    setSelectedRecordingIds({})
    setAccessToken('')
  }

  async function createProject() {
    const name = window.prompt('项目名称？', `我的故事项目 ${projects.length + 1}`)
    if (!name) return
    const res = (await createProjectApi(name)) as any
    refreshApiLogs()
    if (!res?.ok) {
      window.alert(res?.error?.message ?? '创建失败')
      return
    }
    await loadProjects()
  }

  async function onDeleteActiveProject() {
    if (!activeProject) return
    const ok = window.confirm(`删除项目「${activeProject.name}」？（将删除其录音与文本）`)
    if (!ok) return
    const res = (await deleteProjectApi(activeProject.id)) as any
    refreshApiLogs()
    if (!res?.ok) {
      window.alert(res?.error?.message ?? '删除失败')
      return
    }
    setRecordingBlobs({})
    localStorage.removeItem(LS_TRANSCRIPT_PREFIX + activeProject.id)
    localStorage.removeItem(LS_STORY_PREFIX + activeProject.id)
    await loadProjects()
  }

  async function startRecording() {
    setRecordingError('')
    if (!activeProject) return setRecordingError('请先选择或新建一个项目。')
    if (mediaRecorderRef.current) return
    setRecordingStatus('正在请求麦克风权限…')

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStreamRef.current = stream

    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

    chunksRef.current = []
    recorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data)
    }
    recorder.onerror = () => setRecordingError('录音失败：MediaRecorder error')
    recorder.start()
    mediaRecorderRef.current = recorder

    const startedAt = Date.now()
    recordingStartedAtRef.current = startedAt
    setRecordingElapsedMs(0)
    clearRecordingTimers()
    recordingTickRef.current = window.setInterval(() => {
      const s = recordingStartedAtRef.current
      if (!s) return
      setRecordingElapsedMs(Date.now() - s)
    }, 250)
    recordingStopRef.current = window.setTimeout(() => {
      void stopRecording('max_duration')
    }, MAX_RECORDING_MS)

    setRecordingStatus('录音中')
  }

  async function stopRecording(reason?: 'max_duration') {
    setRecordingError('')
    const recorder = mediaRecorderRef.current
    const stream = mediaStreamRef.current
    if (!recorder) return
    clearRecordingTimers()
    recordingStartedAtRef.current = null
    setRecordingStatus(reason === 'max_duration' ? '已到 5 分钟上限，正在保存…' : '正在保存录音片段…')

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const parts = chunksRef.current
        chunksRef.current = []
        resolve(new Blob(parts, { type: recorder.mimeType || 'audio/webm' }))
      }
      try {
        recorder.stop()
      } catch {
        resolve(new Blob([], { type: recorder.mimeType || 'audio/webm' }))
      }
    })

    mediaRecorderRef.current = null
    if (stream) for (const t of stream.getTracks()) t.stop()
    mediaStreamRef.current = null

    try {
      if (!activeProjectId) return
      const durationMs = await getAudioDurationMs(blob)
      const mimeType = blob.type || 'audio/webm'
      const ext = extFromMime(mimeType)

      // Prefer presigned direct upload; fallback to proxy upload when CORS blocks R2 (common in local dev).
      setRecordingStatus('准备上传到云端…')
      let recordingId = ''
      if (shouldUseDirectR2Upload()) {
        try {
        const initRes = (await initRecordingUpload({
          projectId: activeProjectId,
          mimeType,
          ext,
          sizeBytes: blob.size,
        })) as any
        refreshApiLogs()
        if (!initRes?.ok) throw new Error(initRes?.error?.message ?? 'init upload failed')

        setRecordingStatus('上传中…')
        const putUrl = String(initRes.putUrl)
        recordingId = String(initRes.recordingId)
        const put = await fetch(putUrl, { method: 'PUT', headers: { 'content-type': mimeType }, body: blob })
        if (!put.ok) throw new Error(`upload failed: HTTP ${put.status}`)

        await completeRecording(recordingId, { durationMs, sizeBytes: blob.size })
        refreshApiLogs()
        } catch (e: any) {
        const msg = e?.message ?? String(e)
        if (!/cors|preflight|access-control-allow-origin|failed to fetch/i.test(msg)) throw e
        setRecordingStatus('直传被拦截，改用后端中转上传…')
        const proxyRes = (await uploadRecordingProxy({
          projectId: activeProjectId,
          blob,
          filename: `recording_${Date.now()}.${ext}`,
        })) as any
        refreshApiLogs()
        if (!proxyRes?.ok) throw new Error(proxyRes?.error?.message ?? 'proxy upload failed')
        recordingId = String(proxyRes.recordingId)
        await completeRecording(recordingId, { durationMs, sizeBytes: blob.size })
        refreshApiLogs()
        }
      } else {
        // Proxy upload (server-to-R2) avoids browser CORS issues against R2.
        setRecordingStatus('涓婁紶涓€?')
        const proxyRes = (await uploadRecordingProxy({
          projectId: activeProjectId,
          blob,
          filename: `recording_${Date.now()}.${ext}`,
        })) as any
        refreshApiLogs()
        if (!proxyRes?.ok) throw new Error(proxyRes?.error?.message ?? 'proxy upload failed')
        recordingId = String(proxyRes.recordingId)
        await completeRecording(recordingId, { durationMs, sizeBytes: blob.size })
        refreshApiLogs()
      }

      setRecordingStatus('')
      await loadRecordings(activeProjectId)
    } catch (e: any) {
      setRecordingStatus('')
      setRecordingError(e?.message ?? String(e))
    }
  }

  async function ensureRecordingBlob(recordingId: string) {
    if (recordingBlobs[recordingId]) return recordingBlobs[recordingId]
    const res = (await getRecordingBlob(recordingId)) as any
    refreshApiLogs()
    if (!res?.ok) throw new Error(res?.error?.message ?? 'failed to fetch recording blob')
    const blob = res.blob as Blob
    setRecordingBlobs((prev) => ({ ...prev, [recordingId]: blob }))
    return blob
  }

  const recordingsAsc = useMemo(() => {
    return recordings.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [recordings])

  const mergedTranscriptFromRecordings = useMemo(() => {
    const parts: string[] = []
    for (const r of recordingsAsc) {
      const t = String(r.correctionText ?? r.transcriptText ?? '').trim()
      if (t) parts.push(t)
    }
    return parts.join('\n\n')
  }, [recordingsAsc])

  async function applyMergedCorrectionFromServer() {
    if (!activeProjectId) return
    const res = (await getMergedCorrection(activeProjectId)) as any
    refreshApiLogs()
    if (!res?.ok) throw new Error(res?.error?.message ?? 'failed to load merged correction')
    setTranscriptText(String(res.text ?? ''))
  }

  async function transcribeOneRecording(r: CloudRecording) {
    setRecordingSttError((prev) => ({ ...prev, [r.id]: '' }))
    setRecordingSttStatus((prev) => ({ ...prev, [r.id]: 'transcribing' }))
    try {
      const blob = await ensureRecordingBlob(r.id)
      const res = await sttTranscribe({
        audio: blob,
        filename: `recording_${r.id}.${extFromMime(blob.type || r.mimeType || 'audio/webm')}`,
        provider: sttProvider,
        model: sttModel,
        language: 'zh',
        recordingId: r.id,
      })
      refreshApiLogs()
      if (!res?.ok) throw new Error(`${res?.error?.code ?? 'ERROR'}: ${res?.error?.message ?? '请求失败'}`)
      setRecordingSttStatus((prev) => ({ ...prev, [r.id]: 'done' }))
      if (activeProjectId) await loadRecordings(activeProjectId)
    } catch (e: any) {
      setRecordingSttStatus((prev) => ({ ...prev, [r.id]: '' }))
      setRecordingSttError((prev) => ({ ...prev, [r.id]: e?.message ?? String(e) }))
    }
  }

  async function runApiTranscriptionAll() {
    setSttError('')
    if (!activeProjectId) return setSttError('请先选择项目。')
    if (recordingsAsc.length === 0) return setSttError('当前项目还没有录音。')

    setSttStatus('转写中')
    let okCount = 0
    let failCount = 0
    try {
      for (let i = 0; i < recordingsAsc.length; i++) {
        const r = recordingsAsc[i]
        setSttStatus(`转写中（${i + 1}/${recordingsAsc.length}）`)
        setRecordingSttError((prev) => ({ ...prev, [r.id]: '' }))
        setRecordingSttStatus((prev) => ({ ...prev, [r.id]: 'transcribing' }))
        try {
          const blob = await ensureRecordingBlob(r.id)
          const res = await sttTranscribe({
            audio: blob,
            filename: `recording_${r.id}.${extFromMime(blob.type || r.mimeType || 'audio/webm')}`,
            provider: sttProvider,
            model: sttModel,
            language: 'zh',
            recordingId: r.id,
          })
          refreshApiLogs()
          if (!res?.ok) throw new Error(`${res?.error?.code ?? 'ERROR'}: ${res?.error?.message ?? '请求失败'}`)
          okCount++
          setRecordingSttStatus((prev) => ({ ...prev, [r.id]: 'done' }))
        } catch (e: any) {
          failCount++
          setRecordingSttStatus((prev) => ({ ...prev, [r.id]: '' }))
          setRecordingSttError((prev) => ({ ...prev, [r.id]: e?.message ?? String(e) }))
        }
      }

      await loadRecordings(activeProjectId)
      const merged = mergedTranscriptFromRecordings
      setTranscriptText(merged)
      localStorage.setItem(LS_TRANSCRIPT_PREFIX + activeProjectId, merged)
      await saveProjectDraft(activeProjectId, merged)
      refreshApiLogs()
      setSttStatus(failCount ? `完成（成功 ${okCount}，失败 ${failCount}）` : '完成')
      window.setTimeout(() => setSttStatus(''), 1200)
    } catch (e: any) {
      setSttStatus('')
      setSttError(e?.message ?? String(e))
    }
  }

  async function runApiRefine() {
    setRewriteError('')
    if (!activeProjectId) return
    const input = transcriptText.trim()
    if (!input) return setRewriteError('请先得到转写文本。')

    setRewriteStatus('改写中')
    const res = await textRefine({
      text: input,
      mode: refineMode,
      provider: textProvider,
      model: textModel,
    })
    refreshApiLogs()
    if (!res?.ok) {
      setRewriteStatus('')
      setRewriteError(`${res?.error?.code ?? 'ERROR'}: ${res?.error?.message ?? '请求失败'}`)
      return
    }
    const out = ((res.result ?? '') as string).trim()
    setStoryText(out)
    setStoryRulesSummary(`mode=${refineMode} provider=${textProvider} model=${textModel}`)
    localStorage.setItem(LS_STORY_PREFIX + activeProjectId, JSON.stringify({ text: out, rulesSummary: `mode=${refineMode}` }))
    await saveProjectFinal(activeProjectId, out)
    refreshApiLogs()
    setRewriteStatus('')
  }

  async function onRollbackFinal() {
    if (!activeProjectId) return
    const ok = window.confirm('撤销：恢复到上一版故事？')
    if (!ok) return
    const res = (await rollbackProjectFinal(activeProjectId)) as any
    refreshApiLogs()
    if (!res?.ok) {
      window.alert(res?.error?.message ?? '撤销失败')
      return
    }
    await loadProjectTexts(activeProjectId)
  }

  const buildId = (import.meta as any)?.env?.VITE_BUILD_ID as string | undefined

  if (!authed) {
    return (
      <div className="app">
        <header className="topbar">
          <div>
            <div className="title">Verstory</div>
            <div className="subtitle">登录后开始录音与整理</div>
            {buildId ? <div className="subtitle">build={buildId}</div> : null}
          </div>
        </header>

        <div className="layoutAuth">
          <div className="panel">
            <div className="panelHeader">
              <div className="panelTitle">登录</div>
            </div>
            <div className="muted">仅允许预置用户登录。</div>
            <div className="field">
              <div className="label">邮箱</div>
              <input className="input" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            </div>
            <div className="field">
              <div className="label">密码</div>
              <input className="input" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            </div>
            {authError ? <div className="errorText">{authError}</div> : null}
            <div className="actions">
              <button className="btn" type="button" onClick={() => void onLogin()} disabled={!authEmail || !authPassword}>
                登录
              </button>
              <button className="btn" type="button" onClick={() => (clearApiLogs(), refreshApiLogs())}>
                清空 API 日志
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="title">Verstory</div>
          <div className="subtitle">录音 → 转写 → 改写（云端存储）</div>
          {buildId ? <div className="subtitle">build={buildId}</div> : null}
        </div>
        <div className="actions">
          <button className="btn" type="button" onClick={() => void createProject()}>
            新建项目
          </button>
          <button className="btn" type="button" onClick={() => void onDeleteActiveProject()} disabled={!activeProject}>
            删除项目
          </button>
          <button className="btn" type="button" onClick={() => void onLogout()}>
            退出登录
          </button>
        </div>
      </header>

      <div className="layout">
        <div className="panel sidebar">
          <div className="panelHeader">
            <div className="panelTitle">项目</div>
          </div>
          <ul className="projectList">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  className={'projectItem' + (p.id === activeProjectId ? ' active' : '')}
                  type="button"
                  onClick={() => setActiveProjectId(p.id)}
                >
                  <div className="projectName">{p.name}</div>
                  <div className="projectMeta">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''}</div>
                </button>
              </li>
            ))}
          </ul>
          {projects.length === 0 ? <div className="placeholder">还没有项目，点右上角新建。</div> : null}
        </div>

        <div className="main">
          <div className="panel">
            <div className="panelHeader">
              <div className="panelTitle">录音</div>
              {recordingStatus ? <div className="badge running">录音中</div> : null}
            </div>
            <div className="muted">录音会上传到云端（R2），可跨设备继续。</div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => void startRecording()} disabled={!activeProject || isRecording}>
                开始录音
              </button>
              <button className="btn" type="button" onClick={() => void stopRecording()} disabled={!isRecording}>
                停止录音
              </button>
              {isRecording ? (
                <div className="recordingLive">
                  <span className="recDot" />
                  <RecordingWaveform stream={mediaStreamRef.current} />
                  <span className="muted">{formatDurationMs(recordingElapsedMs)}</span>
                </div>
              ) : null}
            </div>
            {recordingStatus ? <div className="placeholder">{recordingStatus}</div> : null}
            {recordingError ? <div className="errorText">{recordingError}</div> : null}

            <div className="sectionTitle">录音列表</div>
            <div className="actions">
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const next: Record<string, boolean> = {}
                  for (const r of recordings) next[r.id] = true
                  setSelectedRecordingIds(next)
                }}
                disabled={recordings.length === 0}
              >
                全选
              </button>
              <button className="btn" type="button" onClick={() => setSelectedRecordingIds({})} disabled={selectedIds.length === 0}>
                取消全选
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={() => void (async () => {
                  if (selectedIds.length === 0) return
                  const ok = window.confirm(`删除 ${selectedIds.length} 条录音？`)
                  if (!ok) return
                  const res = (await bulkDeleteRecordings(selectedIds)) as any
                  refreshApiLogs()
                  if (!res?.ok) return window.alert(res?.error?.message ?? '删除失败')
                  setRecordingBlobs({})
                  setOpenPlayers({})
                  setSelectedRecordingIds({})
                  if (activeProjectId) await loadRecordings(activeProjectId)
                })()}
                disabled={selectedIds.length === 0}
              >
                删除所选
              </button>
              {activeProjectId ? (
                <button className="btn" type="button" onClick={() => void loadRecordings(activeProjectId)}>
                  刷新
                </button>
              ) : null}
            </div>

            {recordingsAsc.length === 0 ? (
              <div className="placeholder">当前项目还没有录音。</div>
            ) : (
              <div className="recordingList">
                {recordingsAsc.map((r) => (
                  <div key={r.id} className="recordingItem">
                    <div className="recordingRow">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedRecordingIds[r.id])}
                          onChange={(e) => setSelectedRecordingIds((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                        />
                      </label>
                      <div className="recordingMeta">
                        <div className="recordingTitle">
                          {new Date(r.createdAt).toLocaleString()}{' '}
                          {r.durationMs ? <span className="muted">({formatDurationMs(r.durationMs)})</span> : null}
                        </div>
                        <div className="muted">
                          {r.mimeType ? r.mimeType : 'audio'} {r.sizeBytes ? `· ${Math.round(Number(r.sizeBytes) / 1024)}KB` : ''}
                        </div>
                      </div>
                      <div className="recordingActions">
                        <button
                          className="btn"
                          type="button"
                          onClick={() => void (async () => {
                            await ensureRecordingBlob(r.id)
                            setOpenPlayers((prev) => ({ ...prev, [r.id]: true }))
                          })()}
                        >
                          播放
                        </button>
                        <button className="btn" type="button" onClick={() => void transcribeOneRecording(r)} disabled={recordingSttStatus[r.id] === 'transcribing'}>
                          {recordingSttStatus[r.id] === 'transcribing' ? '转写中…' : '转写'}
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => void (async () => {
                            const ok = window.confirm('删除这条录音？')
                            if (!ok) return
                            const res = (await deleteRecording(r.id)) as any
                            refreshApiLogs()
                            if (!res?.ok) return window.alert(res?.error?.message ?? '删除失败')
                            setSelectedRecordingIds((prev) => {
                              const next = { ...prev }
                              delete next[r.id]
                              return next
                            })
                            setRecordingBlobs((prev) => {
                              const next = { ...prev }
                              delete next[r.id]
                              return next
                            })
                            setOpenPlayers((prev) => {
                              const next = { ...prev }
                              delete next[r.id]
                              return next
                            })
                            if (activeProjectId) await loadRecordings(activeProjectId)
                          })()}
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    {recordingSttError[r.id] ? <div className="errorText">{recordingSttError[r.id]}</div> : null}
                    {r.correctionText ? (
                      <div className="recordingTranscript">
                        <div className="muted">已校正：</div>
                        {r.correctionText}
                      </div>
                    ) : r.transcriptText ? (
                      <div className="recordingTranscript">{r.transcriptText}</div>
                    ) : null}
                    {openPlayers[r.id] && recordingBlobs[r.id] ? (
                      <div className="recordingPlayer">
                        <AudioPlayer source={recordingBlobs[r.id]} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panelTabs">
            <button className={'tab' + (activeTab === 'stt' ? ' active' : '')} onClick={() => setActiveTab('stt')} type="button">
              转写
            </button>
            <button
              className={'tab' + (activeTab === 'rewrite' ? ' active' : '')}
              onClick={() => setActiveTab('rewrite')}
              type="button"
            >
              改写
            </button>
          </div>

          <div className={'panel ' + (activeTab === 'stt' ? '' : 'hideOnMobile')}>
            <div className="panelHeader">
              <div className="panelTitle">转写</div>
              {sttStatus ? (
                <div className="badge running">
                  转写中 <span className="spinner" />
                </div>
              ) : null}
            </div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => void runApiTranscriptionAll()} disabled={recordingsAsc.length === 0}>
                转写全部
              </button>
              <button className="btn" type="button" onClick={() => void applyMergedCorrectionFromServer()} disabled={!activeProjectId}>
                从服务端载入“校正合并稿”
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => void (async () => {
                  if (!activeProjectId) return
                  const merged = mergedTranscriptFromRecordings
                  setTranscriptText(merged)
                  localStorage.setItem(LS_TRANSCRIPT_PREFIX + activeProjectId, merged)
                  const res = (await saveProjectDraft(activeProjectId, merged)) as any
                  refreshApiLogs()
                  if (!res?.ok) window.alert(res?.error?.message ?? '保存失败')
                })()}
                disabled={!activeProjectId}
              >
                汇总到文本
              </button>
              {recordingsAsc.length === 1 ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => void (async () => {
                    const only = recordingsAsc[0]
                    const res = (await saveRecordingCorrection(only.id, transcriptText)) as any
                    refreshApiLogs()
                    if (!res?.ok) window.alert(res?.error?.message ?? '保存校正失败')
                    if (activeProjectId) await loadRecordings(activeProjectId)
                  })()}
                  disabled={!transcriptText.trim()}
                >
                  保存为该录音的“校正稿”（仅1条录音时）
                </button>
              ) : null}
              <select className="input" value={sttProvider} onChange={(e) => setSttProvider(e.target.value)}>
                {models?.providers
                  ?.filter((p) => p.enabled)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
              </select>
              <input className="input" value={sttModel} onChange={(e) => setSttModel(e.target.value)} placeholder="stt model" />
            </div>
            {sttError ? <div className="errorText">{sttError}</div> : null}
            <textarea className="textArea" value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} />
          </div>

          <div className={'panel ' + (activeTab === 'rewrite' ? '' : 'hideOnMobile')}>
            <div className="panelHeader">
              <div className="panelTitle">改写</div>
              {rewriteStatus ? (
                <div className="badge running">
                  改写中 <span className="spinner" />
                </div>
              ) : null}
            </div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => void runApiRefine()} disabled={!transcriptText.trim()}>
                开始改写
              </button>
              <button className="btn" type="button" onClick={() => void onRollbackFinal()} disabled={!storyText.trim()}>
                撤销到上一版
              </button>
              <select className="input" value={refineMode} onChange={(e) => setRefineMode(e.target.value as any)}>
                <option value="clean">clean</option>
                <option value="organize">organize</option>
                <option value="memoir">memoir</option>
                <option value="goal">goal</option>
              </select>
              <select className="input" value={textProvider} onChange={(e) => setTextProvider(e.target.value)}>
                {models?.providers
                  ?.filter((p) => p.enabled)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
              </select>
              <input className="input" value={textModel} onChange={(e) => setTextModel(e.target.value)} placeholder="text model" />
            </div>
            {rewriteError ? <div className="errorText">{rewriteError}</div> : null}
            {storyRulesSummary ? <div className="muted">{storyRulesSummary}</div> : null}
            <textarea className="textArea" value={storyText} onChange={(e) => setStoryText(e.target.value)} />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <div className="panelTitle">API 日志</div>
            </div>
            <div className="actions">
              <button className="btn" type="button" onClick={() => (clearApiLogs(), refreshApiLogs())}>
                清空
              </button>
              <button className="btn" type="button" onClick={() => clearLocalProjectCache()}>
                清理本地缓存
              </button>
              <button className="btn" type="button" onClick={() => void loadProjects()}>
                刷新项目
              </button>
              {activeProjectId ? (
                <button className="btn" type="button" onClick={() => void loadRecordings(activeProjectId)}>
                  刷新录音
                </button>
              ) : null}
            </div>
            <div className="apiLog">
              {apiLogs.slice().reverse().map((l) => (
                <div key={l.ts} className="apiLogItem">
                  <div className="apiLogTop">
                    <span className="apiLogMethod">{l.method}</span>
                    <span className="apiLogUrl">{l.url}</span>
                  </div>
                  <div className="apiLogMeta">
                    <span>status={l.status}</span>
                    <span>ok={String(l.ok)}</span>
                    <span>{l.durationMs}ms</span>
                    {l.errorCode ? <span>{l.errorCode}</span> : null}
                    {l.errorMessage ? <span className="apiLogErr">{l.errorMessage}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
