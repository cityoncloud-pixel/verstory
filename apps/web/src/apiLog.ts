export type ApiLogEntry = {
  id: string
  ts: string
  method: string
  url: string
  status?: number
  ok?: boolean
  durationMs?: number
  errorCode?: string
  errorMessage?: string
  details?: unknown
}

const LS_API_LOG_KEY = 'verstory.apiLog.v1'
const MAX_ENTRIES = 200

function newId() {
  return `log_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function getApiLogs(): ApiLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_API_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ApiLogEntry[]) : []
  } catch {
    return []
  }
}

export function clearApiLogs() {
  localStorage.removeItem(LS_API_LOG_KEY)
}

export function appendApiLog(entry: Omit<ApiLogEntry, 'id' | 'ts'> & { ts?: string; id?: string }) {
  const next: ApiLogEntry = {
    id: entry.id ?? newId(),
    ts: entry.ts ?? new Date().toISOString(),
    method: entry.method,
    url: entry.url,
    status: entry.status,
    ok: entry.ok,
    durationMs: entry.durationMs,
    errorCode: entry.errorCode,
    errorMessage: entry.errorMessage,
    details: entry.details,
  }

  const list = getApiLogs()
  list.unshift(next)
  const trimmed = list.slice(0, MAX_ENTRIES)
  localStorage.setItem(LS_API_LOG_KEY, JSON.stringify(trimmed))
  return next
}

