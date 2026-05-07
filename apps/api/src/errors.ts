export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'PROVIDER_DISABLED'
  | 'MODEL_NOT_ALLOWED'
  | 'MISSING_API_KEY'
  | 'INTERNAL_ERROR'

export type ApiErrorBody = {
  ok: false
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> }
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorBody {
  return { ok: false, error: { code, message, details } }
}
