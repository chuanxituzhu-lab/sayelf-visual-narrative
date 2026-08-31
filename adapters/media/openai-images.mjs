import { openAIProvider } from '../providers/openai.mjs';

export function createProvider() {
  return {
    id: 'openai-images',
    transport: 'api',
    configured: Boolean(process.env.OPENAI_API_KEY),
    ready: Boolean(process.env.OPENAI_API_KEY),
    async submit({ request }) {
      const prompts = request.prompts?.length ? request.prompts : [request.prompt].filter(Boolean);
      const assets = [];
      for (let index = 0; index < prompts.length; index += 1) {
        const result = await openAIProvider.generatePrompt(prompts[index], {
          model: request.options?.model,
          quality: request.options?.quality,
          outputFormat: request.options?.output_format || 'png',
          size: request.options?.size,
          aspectRatio: request.aspect_ratio,
          n: 1
        });
        for (const image of result.images) assets.push({
          index: assets.length,
          type: 'image',
          mime_type: 'image/png',
          data: image.b64_json,
          url: image.url
        });
      }
      return { status: 'completed', assets };
    }
  };
}
