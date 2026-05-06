export type ProviderId = 'openai' | 'deepseek' | 'doubao'
export type ModelKind = 'stt' | 'text'

export type ProviderModels = {
  stt?: string[]
  text?: string[]
}

export type ProviderDefinition = {
  id: ProviderId
  enabled: boolean
  apiKeyEnv: string
  baseUrl?: string
  models: ProviderModels
}

export type ModelDefaults = {
  stt: { provider: ProviderId; model: string }
  text: { provider: ProviderId; model: string }
}

export type ModelRegistry = {
  providers: Record<ProviderId, ProviderDefinition>
  defaults: ModelDefaults
}

export function getModelRegistry(): ModelRegistry {
  const providers: Record<ProviderId, ProviderDefinition> = {
    openai: {
      id: 'openai',
      enabled: true,
      apiKeyEnv: 'OPENAI_API_KEY',
      models: {
        stt: ['whisper-1', 'gpt-4o-mini-transcribe'],
        text: ['gpt-4.1-mini', 'gpt-4o-mini'],
      },
    },
    doubao: {
      id: 'doubao',
      enabled: true,
      apiKeyEnv: 'DOUBAO_API_KEY',
      baseUrl: 'https://openspeech.bytedance.com',
      models: {
        // 标准版资源 ID（见火山引擎文档）
        stt: ['volc.seedasr.auc', 'volc.bigasr.auc'],
      },
    },
    deepseek: {
      id: 'deepseek',
      enabled: true,
      apiKeyEnv: 'DEEPSEEK_API_KEY',
      // DeepSeek 的 OpenAI-compatible endpoint（由部署时文档/环境变量确认，可后续参数化）
      baseUrl: 'https://api.deepseek.com',
      models: {
        text: ['deepseek-chat', 'deepseek-reasoner'],
      },
    },
  }

  const defaults: ModelDefaults = {
    stt: { provider: 'doubao', model: 'volc.seedasr.auc' },
    text: { provider: 'deepseek', model: 'deepseek-chat' },
  }

  return { providers, defaults }
}

export function isModelAllowed(
  registry: ModelRegistry,
  kind: ModelKind,
  provider: ProviderId,
  model: string,
) {
  const def = registry.providers[provider]
  const list = kind === 'stt' ? def.models.stt : def.models.text
  return Array.isArray(list) && list.includes(model)
}
