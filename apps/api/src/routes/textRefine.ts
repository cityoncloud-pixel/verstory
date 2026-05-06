import type { FastifyInstance } from 'fastify'
import { apiError } from '../errors.js'
import { getModelRegistry, isModelAllowed, type ProviderId } from '../modelRegistry.js'
import { createOpenAIClient } from '../providers/openaiClient.js'
import { buildRefinePrompt, type RefineMode } from '../prompts/textRefine.js'

type RefineBody = {
  text?: string
  mode?: RefineMode
  provider?: ProviderId
  model?: string
}

export async function registerTextRefineRoutes(app: FastifyInstance) {
  app.post('/api/text/refine', async (req, reply) => {
    const body = (req.body ?? {}) as RefineBody
    const registry = getModelRegistry()

    const text = (body.text ?? '').trim()
    if (!text) return reply.code(400).send(apiError('BAD_REQUEST', 'missing text'))

    const mode = (body.mode ?? 'clean') as RefineMode
    if (!['clean', 'organize', 'memoir', 'goal'].includes(mode)) {
      return reply.code(400).send(apiError('BAD_REQUEST', 'invalid mode', { mode }))
    }

    const provider = (body.provider ?? registry.defaults.text.provider) as ProviderId
    const model = (body.model ?? registry.defaults.text.model) as string

    const providerDef = registry.providers[provider]
    if (!providerDef || !providerDef.enabled) {
      return reply.code(400).send(apiError('PROVIDER_DISABLED', 'provider disabled', { provider }))
    }
    if (!isModelAllowed(registry, 'text', provider, model)) {
      return reply.code(400).send(apiError('MODEL_NOT_ALLOWED', 'model not allowed', { provider, model }))
    }

    const apiKey = process.env[providerDef.apiKeyEnv]
    if (!apiKey || !apiKey.trim()) {
      return reply.code(401).send(
        apiError('MISSING_API_KEY', 'missing api key', { env: providerDef.apiKeyEnv, provider }),
      )
    }

    const prompt = buildRefinePrompt(mode, text)

    try {
      const client = createOpenAIClient(apiKey, { baseURL: providerDef.baseUrl })

      const started = Date.now()
      const temperature =
        mode === 'clean' ? 0.1 : mode === 'memoir' ? 0.6 : mode === 'organize' ? 0.3 : 0.2

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature,
      })
      const result = completion.choices[0]?.message?.content?.trim() ?? ''
      const duration = (Date.now() - started) / 1000
      if (!result) return reply.code(502).send(apiError('INTERNAL_ERROR', 'empty model response'))

      return reply.send({ ok: true, result, mode, provider, model, duration })
    } catch (e: any) {
      app.log.error(e)
      return reply.code(502).send(apiError('INTERNAL_ERROR', 'text provider call failed'))
    }
  })
}
