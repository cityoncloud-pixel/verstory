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

export function getApiBase() {
  return 'https://story-api.suenbeya.com'
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

  return loggedJsonFetch(`${getApiBase()}/api/stt/transcribe`, { method: 'POST', body: form })
}

export async function textRefine(params: {
  text: string
  mode: 'clean' | 'organize' | 'goal'
  provider: string
  model: string
}) {
  return loggedJsonFetch(`${getApiBase()}/api/text/refine`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}
