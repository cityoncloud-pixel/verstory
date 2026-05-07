import { appendApiLog } from './apiLog'

export type ModelsResponse = {
  ok: boolean
  providers: Array<{
    id: string
    enabled: boolean
    apiKeyEnv: string
    models: { stt?: string[]; text?: string[] }
  }>
  defaults: {
    stt: { provider: string; model: string }
    text: { provider: string; model: string }
  }
}

export type ApiError = { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } }

const LS_ACCESS_TOKEN_KEY = 'verstory.accessToken.v1'

export function getApiBase() {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE as string | undefined
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, '')
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8080'
  }
  return 'https://story-api.suenbeya.com'
}

export function getAccessToken() {
  return localStorage.getItem(LS_ACCESS_TOKEN_KEY) || ''
}

export function setAccessToken(token: string) {
  if (token) localStorage.setItem(LS_ACCESS_TOKEN_KEY, token)
  else localStorage.removeItem(LS_ACCESS_TOKEN_KEY)
}

function parseJsonText(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return { ok: false, error: { code: 'BAD_JSON', message: text } }
  }
}

async function loggedJsonFetch(input: string, init: RequestInit) {
  const started = Date.now()
  let status: number | undefined
  let text = ''
  try {
    const res = await fetch(input, init)
    status = res.status
    text = await res.text()
    const parsed = parseJsonText(text)
    const ok = Boolean(parsed && typeof parsed === 'object' && (parsed as any).ok)
    const err = parsed && typeof parsed === 'object' ? (parsed as any).error : null
    appendApiLog({
      method: (init.method ?? 'GET').toUpperCase(),
      url: input,
      status,
      ok,
      durationMs: Date.now() - started,
      errorCode: err?.code,
      errorMessage: err?.message,
      details: err?.details,
    })
    return parsed
  } catch (e: any) {
    appendApiLog({
      method: (init.method ?? 'GET').toUpperCase(),
      url: input,
      status,
      ok: false,
      durationMs: Date.now() - started,
      errorCode: 'NETWORK_ERROR',
      errorMessage: e?.message ?? String(e),
    })
    return { ok: false, error: { code: 'NETWORK_ERROR', message: e?.message ?? String(e) } }
  }
}

export async function fetchModels(): Promise<ModelsResponse | ApiError> {
  return (await loggedJsonFetch(`${getApiBase()}/api/models`, { method: 'GET' })) as any
}

async function authedJsonFetch(input: string, init: RequestInit, retry = true) {
  const headers = new Headers(init.headers ?? undefined)
  const token = getAccessToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  const res = (await loggedJsonFetch(input, { ...init, headers, credentials: 'include' })) as any
  // Only attempt refresh when we already have an access token (avoids noisy 401 loops before login).
  if (
    retry &&
    token &&
    res &&
    typeof res === 'object' &&
    res.ok === false &&
    res.error?.code === 'UNAUTHORIZED'
  ) {
    const refreshed = await refreshAccessToken()
    if (refreshed?.ok) return authedJsonFetch(input, init, false)
  }
  return res
}

async function authedFetch(input: string, init: RequestInit, retry = true) {
  const headers = new Headers(init.headers ?? undefined)
  const token = getAccessToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  const res = await fetch(input, { ...init, headers, credentials: 'include' })
  // Only attempt refresh when we already have an access token (avoids noisy 401 loops before login).
  if (retry && token && res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed?.ok) return authedFetch(input, init, false)
  }
  return res
}

export async function login(email: string, password: string) {
  const res = (await loggedJsonFetch(`${getApiBase()}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })) as any
  if (res?.ok && res.accessToken) setAccessToken(String(res.accessToken))
  return res
}

export async function refreshAccessToken() {
  const res = (await loggedJsonFetch(`${getApiBase()}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })) as any
  if (res?.ok && res.accessToken) setAccessToken(String(res.accessToken))
  return res
}

export async function logout() {
  setAccessToken('')
  return loggedJsonFetch(`${getApiBase()}/api/auth/logout`, { method: 'POST', credentials: 'include' })
}

export async function listProjectsApi() {
  return authedJsonFetch(`${getApiBase()}/api/projects`, { method: 'GET' })
}

export async function createProjectApi(name: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteProjectApi(id: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function initRecordingUpload(params: {
  projectId: string
  mimeType: string
  ext: string
  sizeBytes?: number
}) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(params.projectId)}/recordings/init`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function uploadRecordingProxy(params: { projectId: string; blob: Blob; filename: string }) {
  const form = new FormData()
  form.append('audio', params.blob, params.filename)
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(params.projectId)}/recordings/upload`, {
    method: 'POST',
    body: form,
  })
}

export async function completeRecording(recordingId: string, params: { durationMs?: number; sizeBytes?: number; sha256?: string }) {
  return authedJsonFetch(`${getApiBase()}/api/recordings/${encodeURIComponent(recordingId)}/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function listRecordings(projectId: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(projectId)}/recordings`, { method: 'GET' })
}

export async function getRecordingSignedUrl(recordingId: string) {
  return authedJsonFetch(`${getApiBase()}/api/recordings/${encodeURIComponent(recordingId)}/signed-url`, { method: 'GET' })
}

export async function getRecordingBlob(recordingId: string) {
  const res = await authedFetch(`${getApiBase()}/api/recordings/${encodeURIComponent(recordingId)}/blob`, { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return parseJsonText(text)
  }
  const blob = await res.blob()
  return { ok: true, blob }
}

export async function getProjectTexts(projectId: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(projectId)}/texts`, { method: 'GET' })
}

export async function saveProjectDraft(projectId: string, text: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(projectId)}/draft`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

export async function saveProjectFinal(projectId: string, text: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(projectId)}/final`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

export async function rollbackProjectFinal(projectId: string) {
  return authedJsonFetch(`${getApiBase()}/api/projects/${encodeURIComponent(projectId)}/final/rollback`, { method: 'POST' })
}

export async function sttTranscribe(params: {
  audio: Blob
  filename: string
  provider: string
  model: string
  language?: string
}) {
  const form = new FormData()
  form.append('provider', params.provider)
  form.append('model', params.model)
  if (params.language) form.append('language', params.language)
  form.append('audio', params.audio, params.filename)

  return authedJsonFetch(`${getApiBase()}/api/stt/transcribe`, { method: 'POST', body: form })
}

export async function textRefine(params: {
  text: string
  mode: 'clean' | 'organize' | 'memoir' | 'goal'
  provider: string
  model: string
}) {
  return authedJsonFetch(`${getApiBase()}/api/text/refine`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}
