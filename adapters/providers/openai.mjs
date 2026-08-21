import { compileCanonicalPrompt } from '../../core/compiler.mjs';

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/images/generations';

export const openAIProvider = {
  id: 'openai',

  compile(spec, options = {}) {
    const prompt = compileCanonicalPrompt(spec);
    return {
      provider: 'openai',
      request: {
        model: options.model || process.env.SAYELF_OPENAI_IMAGE_MODEL || 'gpt-image-2',
        prompt,
        size: options.size || aspectRatioToSize(spec?.constraints?.aspect_ratio),
        quality: options.quality || 'auto',
        output_format: options.outputFormat || 'png',
        n: options.n || 1
      },
      metadata: { mode: spec.mode }
    };
  },

  async generate(spec, options = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI image generation');
    }

    const compiled = this.compile(spec, options);
    const response = await fetch(options.endpoint || DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(compiled.request),
      signal: options.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `OpenAI image request failed with HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return {
      provider: 'openai',
      model: compiled.request.model,
      request: compiled.request,
      images: (payload.data || []).map((item, index) => ({
        index,
        b64_json: item.b64_json,
        url: item.url,
        revised_prompt: item.revised_prompt
      })),
      usage: payload.usage,
      raw: payload
    };
  }
};

export function aspectRatioToSize(aspectRatio) {
  switch (String(aspectRatio || '').trim()) {
    case '3:4':
    case '2:3':
    case '9:16':
      return '1024x1536';
    case '4:3':
    case '3:2':
    case '16:9':
      return '1536x1024';
    default:
      return '1024x1024';
  }
}
