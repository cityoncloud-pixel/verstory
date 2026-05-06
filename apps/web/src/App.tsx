import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import {
  deleteProject,
  deleteSegment,
  type Project,
  type RecordingSegment,
  listProjects,
  listSegments,
  putProject,
  putSegment,
} from './db'
import { AudioPlayer } from './AudioPlayer'
import { MockStoryPolishProvider } from './providers/polish'
import { MockTranscriptionProvider } from './providers/transcription'
import { fetchModels, sttTranscribe, textRefine, type ModelsResponse } from './apiClient'
import { clearApiLogs, getApiLogs } from './apiLog'

const LS_ACTIVE_PROJECT_KEY = 'verstory.activeProjectId.v1'
const LS_TRANSCRIPT_PREFIX = 'verstory.transcript.v1.'
const LS_STORY_PREFIX = 'verstory.story.v1.'
const MAX_RECORDING_MS = 5 * 60 * 1000

function nowIso() {
  return new Date().toISOString()
}

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function formatDurationMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function safeFileName(input: string) {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem(LS_ACTIVE_PROJECT_KEY)
  })
  const [segments, setSegments] = useState<RecordingSegment[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [apiLogs, setApiLogs] = useState(() => getApiLogs())

  const [transcriptText, setTranscriptText] = useState<string>('')
  const [storyText, setStoryText] = useState<string>('')
  const [storyRulesSummary, setStoryRulesSummary] = useState<string>('')

  const [models, setModels] = useState<ModelsResponse | null>(null)
  const [sttProvider, setSttProvider] = useState<string>('openai')
  const [sttModel, setSttModel] = useState<string>('gpt-4o-mini-transcribe')
  const [textProvider, setTextProvider] = useState<string>('deepseek')
  const [textModel, setTextModel] = useState<string>('deepseek-chat')
  const [refineMode, setRefineMode] = useState<'clean' | 'organize' | 'goal'>('clean')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordingStartedAtRef = useRef<number | null>(null)
  const recordingTickRef = useRef<number | null>(null)
  const recordingStopRef = useRef<number | null>(null)
  const [recordingElapsedMs, setRecordingElapsedMs] = useState<number>(0)

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  const isRecording = mediaRecorderRef.current != null

  function refreshApiLogs() {
    setApiLogs(getApiLogs())
  }

  function clearRecordingTimers() {
    if (recordingTickRef.current) window.clearInterval(recordingTickRef.current)
    if (recordingStopRef.current) window.clearTimeout(recordingStopRef.current)
    recordingTickRef.current = null
    recordingStopRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const loaded = await listProjects()
      if (cancelled) return
      setProjects(loaded)
      if (!activeProjectId && loaded.length > 0) setActiveProjectId(loaded[0].id)
    })().catch((e: unknown) => {
      if (cancelled) return
      setError(e instanceof Error ? e.message : String(e))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!activeProjectId) {
      setSegments([])
      setSelectedSegmentId(null)
      return
    }
    ;(async () => {
      const loaded = await listSegments(activeProjectId)
      if (cancelled) return
      setSegments(loaded)
      if (loaded.length > 0) setSelectedSegmentId((prev) => prev ?? loaded[0].id)
    })().catch((e: unknown) => {
      if (cancelled) return
      setError(e instanceof Error ? e.message : String(e))
    })
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
    try {
      const tRaw = localStorage.getItem(LS_TRANSCRIPT_PREFIX + activeProjectId)
      setTranscriptText(tRaw ?? '')

      const sRaw = localStorage.getItem(LS_STORY_PREFIX + activeProjectId)
      if (!sRaw) {
        setStoryText('')
        setStoryRulesSummary('')
        return
      }
      const parsed = JSON.parse(sRaw) as { text?: string; rulesSummary?: string }
      setStoryText(parsed.text ?? '')
      setStoryRulesSummary(parsed.rulesSummary ?? '')
    } catch {
      setTranscriptText('')
      setStoryText('')
      setStoryRulesSummary('')
    }
  }, [activeProjectId])

  useEffect(() => {
    if (activeProjectId) localStorage.setItem(LS_ACTIVE_PROJECT_KEY, activeProjectId)
    else localStorage.removeItem(LS_ACTIVE_PROJECT_KEY)
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

  async function createProject() {
    const name = window.prompt('项目名称：', `我的故事项目 ${projects.length + 1}`)
    if (!name) return
    const t = nowIso()
    const next: Project = { id: newId('proj'), name, createdAt: t, updatedAt: t }
    await putProject(next)
    setProjects(await listProjects())
    setActiveProjectId(next.id)
  }

  async function onDeleteActiveProject() {
    if (!activeProject) return
    const ok = window.confirm(`删除项目「${activeProject.name}」及其所有录音片段？此操作不可恢复。`)
    if (!ok) return
    await deleteProject(activeProject.id)
    setProjects(await listProjects())
    setActiveProjectId(null)
    localStorage.removeItem(LS_TRANSCRIPT_PREFIX + activeProject.id)
    localStorage.removeItem(LS_STORY_PREFIX + activeProject.id)
  }

  async function startRecording() {
    setError('')
    if (!activeProject) return setError('请先选择或新建一个项目。')
    if (mediaRecorderRef.current) return
    setStatus('正在请求麦克风权限…')

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStreamRef.current = stream

    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

    chunksRef.current = []
    recorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data)
    }
    recorder.onerror = () => setError('录音失败：MediaRecorder error')
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

    setStatus('录音中…')
  }

  async function stopRecording(reason?: 'max_duration') {
    setError('')
    const recorder = mediaRecorderRef.current
    const stream = mediaStreamRef.current
    if (!recorder) return
    clearRecordingTimers()
    recordingStartedAtRef.current = null
    setStatus(reason === 'max_duration' ? '已到 5 分钟上限，正在保存…' : '正在保存录音片段…')

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

    const durationMs = await getAudioDurationMs(blob)
    const t = nowIso()
    const seg: RecordingSegment = {
      id: newId('seg'),
      projectId: activeProjectId!,
      createdAt: t,
      durationMs,
      mimeType: blob.type || 'audio/webm',
      blob,
    }
    await putSegment(seg)
    await putProject({ ...activeProject!, updatedAt: nowIso() })
    setProjects(await listProjects())
    const loaded = await listSegments(activeProjectId!)
    setSegments(loaded)
    setSelectedSegmentId(seg.id)
    setStatus('')
  }

  async function onDeleteSegment(seg: RecordingSegment) {
    const ok = window.confirm('删除该录音片段？')
    if (!ok) return
    await deleteSegment(seg.id)
    const loaded = await listSegments(activeProjectId!)
    setSegments(loaded)
    if (selectedSegmentId === seg.id) setSelectedSegmentId(loaded[0]?.id ?? null)
  }

  async function runMockTranscription() {
    setError('')
    if (!activeProjectId) return
    if (segments.length === 0) return setError('当前项目没有录音片段。')
    setStatus('mock 转写中…')
    const provider = new MockTranscriptionProvider()
    const result = await provider.transcribe(segments)
    setTranscriptText(result.mergedText)
    localStorage.setItem(LS_TRANSCRIPT_PREFIX + activeProjectId, result.mergedText)
    setStatus('')
  }

  async function runMockPolish() {
    setError('')
    if (!activeProjectId) return
    const input = transcriptText.trim()
    if (!input) return setError('请先得到转写文本。')
    setStatus('mock 整理中…')
    const provider = new MockStoryPolishProvider()
    const result = await provider.polish(input, {
      forbidFabrication: true,
      forbidChangingFacts: true,
      allowLightCleanup: true,
      keepFirstPersonStyle: true,
    })
    setStoryText(result.storyText)
    setStoryRulesSummary(result.rulesSummary)
    localStorage.setItem(
      LS_STORY_PREFIX + activeProjectId,
      JSON.stringify({ text: result.storyText, rulesSummary: result.rulesSummary }),
    )
    setStatus('')
  }

  async function runApiTranscription() {
    setError('')
    if (!activeProjectId) return
    if (!selectedSegmentId) return setError('请先选择一个片段用于转写。')
    const seg = segments.find((s) => s.id === selectedSegmentId)
    if (!seg) return setError('所选片段不存在。')

    setStatus('STT 转写中…')
    const res = await sttTranscribe({
      audio: seg.blob,
      filename: `segment_${seg.id}.webm`,
      provider: sttProvider,
      model: sttModel,
      language: 'zh',
    })
    refreshApiLogs()
    if (!res?.ok) {
      setStatus('')
      setError(`${res?.error?.code ?? 'ERROR'}: ${res?.error?.message ?? '请求失败'}`)
      return
    }
    setTranscriptText((res.text ?? '') as string)
    localStorage.setItem(LS_TRANSCRIPT_PREFIX + activeProjectId, (res.text ?? '') as string)
    setStatus('')
  }

  async function runApiRefine() {
    setError('')
    if (!activeProjectId) return
    const input = transcriptText.trim()
    if (!input) return setError('请先得到转写文本。')

    setStatus('文本整理中…')
    const res = await textRefine({
      text: input,
      mode: refineMode,
      provider: textProvider,
      model: textModel,
    })
    refreshApiLogs()
    if (!res?.ok) {
      setStatus('')
      setError(`${res?.error?.code ?? 'ERROR'}: ${res?.error?.message ?? '请求失败'}`)
      return
    }
    const out = ((res.result ?? '') as string).trim()
    setStoryText(out)
    setStoryRulesSummary(`mode=${refineMode} provider=${textProvider} model=${textModel}`)
    localStorage.setItem(
      LS_STORY_PREFIX + activeProjectId,
      JSON.stringify({ text: out, rulesSummary: `mode=${refineMode}` }),
    )
    setStatus('')
  }

  async function exportMarkdown() {
    setError('')
    if (!activeProject) return
    const text = storyText.trim()
    if (!text) return setError('没有可导出的文本。')
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const title = safeFileName(activeProject.name || 'verstory')
    const md = `# ${activeProject.name}\n\n- ExportedAt: ${new Date().toLocaleString()}\n\n---\n\n${text}\n`
    downloadText(`${title}_${ts}.md`, md)
  }

  async function copyMarkdown() {
    setError('')
    if (!activeProject) return
    const text = storyText.trim()
    if (!text) return setError('没有可复制的文本。')
    const md = `# ${activeProject.name}\n\n${text}\n`
    try {
      await navigator.clipboard.writeText(md)
      setStatus('已复制 Markdown 到剪贴板。')
      setTimeout(() => setStatus(''), 1800)
    } catch {
      setError('复制失败：浏览器未授权剪贴板权限。')
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="title">Verstory（Phase 4）</div>
          <div className="subtitle">录音 → STT → 文本整理（支持 API + mock）</div>
          {status ? <div className="subtitle">{status}</div> : null}
          {error ? (
            <div className="subtitle" style={{ color: '#ff7b7b' }}>
              {error}
            </div>
          ) : null}
        </div>
        <div className="actions">
          <button className="btn" type="button" onClick={() => void createProject()}>
            新建项目
          </button>
          <button className="btn" type="button" disabled={!activeProject} onClick={() => void onDeleteActiveProject()}>
            删除当前项目
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panelTitle">项目</div>
          {projects.length === 0 ? (
            <div className="muted">暂无项目，点击右上角“新建项目”。</div>
          ) : (
            <ul className="projectList">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={p.id === activeProjectId ? 'projectItem active' : 'projectItem'}
                    onClick={() => setActiveProjectId(p.id)}
                  >
                    <div className="projectName">{p.name}</div>
                    <div className="projectMeta">{new Date(p.updatedAt).toLocaleString()}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panelTitle">录音片段</div>
          {activeProject ? (
            <div className="muted">
              当前项目：<b>{activeProject.name}</b>（片段数：{segments.length}）
            </div>
          ) : (
            <div className="muted">请先选择或新建一个项目。</div>
          )}

          <div className="actions">
            <button className="btn" type="button" disabled={!activeProject || isRecording} onClick={() => void startRecording()}>
              开始录音
            </button>
            <button className="btn" type="button" disabled={!activeProject || !isRecording} onClick={() => void stopRecording()}>
              停止并保存
            </button>
            <div className="muted" style={{ margin: 0 }}>
              {isRecording ? `录音时长：${formatDurationMs(recordingElapsedMs)} / 5:00` : '最长录音 5 分钟'}
            </div>
          </div>

          {segments.length === 0 ? (
            <div className="placeholder">暂无录音片段。</div>
          ) : (
            <div className="placeholder">
              {segments.map((seg) => (
                <div key={seg.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                  <AudioPlayer blob={seg.blob} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>
                      {formatDurationMs(seg.durationMs)} · {new Date(seg.createdAt).toLocaleString()}
                    </div>
                    <div style={{ color: 'rgba(230,231,234,0.7)', fontSize: 11 }}>{seg.mimeType}</div>
                    <div style={{ marginTop: 6 }}>
                      <button className="btn" type="button" onClick={() => setSelectedSegmentId(seg.id)}>
                        {selectedSegmentId === seg.id ? '已选用于转写' : '选择用于转写'}
                      </button>
                    </div>
                  </div>
                  <button className="btn" type="button" onClick={() => void onDeleteSegment(seg)}>
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panelTitle">转写 & 整理</div>
          {activeProject ? (
            <div className="muted">无 API Key 时，API 会返回清晰错误码（例如 MISSING_API_KEY）。</div>
          ) : (
            <div className="muted">请先选择或新建一个项目。</div>
          )}

          <div className="placeholder">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>STT</div>
              <select value={sttProvider} onChange={(e) => setSttProvider(e.target.value)}>
                {(models?.providers ?? [])
                  .filter((p) => p.models.stt && p.models.stt.length > 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
              </select>
              <select value={sttModel} onChange={(e) => setSttModel(e.target.value)}>
                {(models?.providers ?? [])
                  .find((p) => p.id === sttProvider)
                  ?.models.stt?.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )) ?? null}
              </select>
              <button className="btn" type="button" disabled={!activeProject || !selectedSegmentId} onClick={() => void runApiTranscription()}>
                转写（API）
              </button>
              <button className="btn" type="button" disabled={!activeProject} onClick={() => void runMockTranscription()}>
                转写（mock）
              </button>
            </div>
          </div>

          <div className="placeholder">
            <div className="muted" style={{ marginBottom: 8 }}>
              转写文本（可手动修改）
            </div>
            <textarea
              className="textArea"
              value={transcriptText}
              onChange={(e) => {
                const v = e.target.value
                setTranscriptText(v)
                if (activeProjectId) localStorage.setItem(LS_TRANSCRIPT_PREFIX + activeProjectId, v)
              }}
              placeholder="[转写文本会显示在这里]"
            />
          </div>

          <div className="placeholder">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>Text</div>
              <select value={textProvider} onChange={(e) => setTextProvider(e.target.value)}>
                {(models?.providers ?? [])
                  .filter((p) => p.models.text && p.models.text.length > 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
              </select>
              <select value={textModel} onChange={(e) => setTextModel(e.target.value)}>
                {(models?.providers ?? [])
                  .find((p) => p.id === textProvider)
                  ?.models.text?.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )) ?? null}
              </select>
              <select value={refineMode} onChange={(e) => setRefineMode(e.target.value as any)}>
                <option value="clean">clean</option>
                <option value="organize">organize</option>
                <option value="goal">goal</option>
              </select>
              <button className="btn" type="button" disabled={!activeProject || !transcriptText.trim()} onClick={() => void runApiRefine()}>
                整理（API）
              </button>
              <button className="btn" type="button" disabled={!activeProject || !transcriptText.trim()} onClick={() => void runMockPolish()}>
                整理（mock）
              </button>
            </div>
          </div>

          <div className="placeholder">
            <div className="muted" style={{ marginBottom: 8 }}>
              整理结果（可手动修改）{storyRulesSummary ? `（${storyRulesSummary}）` : ''}
            </div>
            <textarea
              className="textArea"
              style={{ minHeight: 320 }}
              value={storyText}
              onChange={(e) => {
                const v = e.target.value
                setStoryText(v)
                if (activeProjectId) {
                  localStorage.setItem(
                    LS_STORY_PREFIX + activeProjectId,
                    JSON.stringify({ text: v, rulesSummary: storyRulesSummary }),
                  )
                }
              }}
              placeholder="[整理结果会显示在这里]"
            />
          </div>

          <div className="placeholder">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>API 调用记录</div>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  refreshApiLogs()
                  setStatus('已刷新 API 日志')
                  setTimeout(() => setStatus(''), 1200)
                }}
              >
                刷新
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  clearApiLogs()
                  refreshApiLogs()
                  setStatus('已清空 API 日志')
                  setTimeout(() => setStatus(''), 1200)
                }}
              >
                清空
              </button>
              <button
                className="btn"
                type="button"
                disabled={apiLogs.length === 0}
                onClick={() => {
                  const ts = new Date().toISOString().replace(/[:.]/g, '-')
                  downloadText(`verstory_api_logs_${ts}.json`, JSON.stringify(apiLogs, null, 2))
                }}
              >
                导出 JSON
              </button>
              <div className="muted" style={{ margin: 0 }}>
                最近 {apiLogs.length} 条（最多保存 200）
              </div>
            </div>

            <div style={{ marginTop: 10, maxHeight: 180, overflow: 'auto' }}>
              {apiLogs.length === 0 ? (
                <div className="muted">暂无记录。执行“转写(API)”或“整理(API)”后会自动写入。</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {apiLogs.slice(0, 40).map((l) => (
                    <div
                      key={l.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: l.ok ? 'rgba(0,0,0,0.12)' : 'rgba(255, 82, 82, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>
                          {l.method} {l.status ?? '-'} {l.ok ? 'OK' : 'ERR'}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(230,231,234,0.7)' }}>
                          {new Date(l.ts).toLocaleString()} · {Math.round((l.durationMs ?? 0) / 10) / 100}s
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(230,231,234,0.75)', marginTop: 4 }}>
                        {l.errorCode ? `${l.errorCode}: ${l.errorMessage ?? ''}` : l.url}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="actions">
            <button className="btn" type="button" disabled={!activeProject || !storyText.trim()} onClick={() => void exportMarkdown()}>
              导出 Markdown
            </button>
            <button className="btn" type="button" disabled={!activeProject || !storyText.trim()} onClick={() => void copyMarkdown()}>
              复制 Markdown
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
