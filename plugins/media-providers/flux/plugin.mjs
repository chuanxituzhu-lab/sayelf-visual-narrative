// FLUX provider — primary route in the illustrator degradation chain.
// Chain: FLUX -> DALL-E 3 -> SDXL/Midjourney (see priority in config/media-providers.json).
//
// Required environment variables (never hard-code keys, never log them):
//   FLUX_API_KEY  - your FLUX API key
//   FLUX_API_BASE - e.g. https://api.bfl.ml or your self-hosted FLUX endpoint

export function createProvider() {
  return {
    async submit({ jobId, request }) {
      const apiKey = process.env.FLUX_API_KEY;
      const apiBase = process.env.FLUX_API_BASE;
      if (!apiKey || !apiBase) {
        return {
          status: 'failed',
          error: 'missing_credentials',
          detail: 'Set FLUX_API_KEY and FLUX_API_BASE before using this provider.'
        };
      }
      if (request.mode !== 'text_to_image') {
        return { status: 'failed', error: 'unsupported_mode', detail: `flux only supports text_to_image, got ${request.mode}` };
      }

      const response = await fetch(`${apiBase}/v1/flux-pro-1.1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-key': apiKey },
        body: JSON.stringify({
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio || '3:4',
          negative_prompt: request.negative_prompt || undefined
        })
      });

      if (!response.ok) {
        return { status: 'failed', error: 'provider_error', detail: `FLUX HTTP ${response.status}` };
      }

      const body = await response.json();
      // FLUX is asynchronous: it returns a polling id, not the image itself.
      return { status: 'processing', provider_job_id: body.id, job_id: jobId };
    },

    async poll({ providerJobId }) {
      const apiKey = process.env.FLUX_API_KEY;
      const apiBase = process.env.FLUX_API_BASE;
      const response = await fetch(`${apiBase}/v1/get_result?id=${providerJobId}`, {
        headers: { 'x-key': apiKey }
      });
      if (!response.ok) {
        return { status: 'failed', error: 'provider_error', detail: `FLUX poll HTTP ${response.status}` };
      }
      const body = await response.json();
      if (body.status !== 'Ready') {
        return { status: 'processing', provider_job_id: providerJobId };
      }
      return {
        status: 'completed',
        assets: [{ data: body.result.sample, mime_type: 'image/jpeg' }]
      };
    }
  };
}
