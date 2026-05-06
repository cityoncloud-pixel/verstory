import OpenAI from 'openai'

export function createOpenAIClient(apiKey: string, opts?: { baseURL?: string }) {
  return new OpenAI({ apiKey, baseURL: opts?.baseURL })
}
