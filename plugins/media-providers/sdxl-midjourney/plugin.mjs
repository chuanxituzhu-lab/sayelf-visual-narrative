// SDXL / Midjourney provider — last-resort route in the illustrator
// degradation chain, used only when both flux and dalle3 fail.
//
// Honesty note: Midjourney has no official public API. This provider talks
// to an SDXL-compatible endpoint (Stability AI or a self-hosted SDXL server)
// by default. If you specifically need Midjourney output, point
// SDXL_API_BASE at a third-party Midjourney proxy you already trust and
// control — do not assume one is bundled here.
//
// Required environment variables:
//   SDXL_API_KEY  - your Stability AI / self-hosted SDXL key
//   SDXL_API_BASE - e.g. https://api.stability.ai

export function createProvider() {
  return {
    async submit({ jobId, request }) {
      const apiKey = process.env.SDXL_API_KEY;
      const apiBase = process.env.SDXL_API_BASE;
      if (!apiKey || !apiBase) {
        return {
          status: 'failed',
          error: 'missing_credentials',
          detail: 'Set SDXL_API_KEY and SDXL_API_BASE before using this provider.'
        };
      }
      if (request.mode !== 'text_to_image') {
        return { status: 'failed', error: 'unsupported_mode', detail: `sdxl-midjourney only supports text_to_image, got ${request.mode}` };
      }

      const [width, height] = mapAspectRatioToDims(request.aspect_ratio);
      const response = await fetch(`${apiBase}/v2beta/stable-image/generate/sd3`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        body: toFormData({
          prompt: request.prompt,
          negative_prompt: request.negative_prompt || '',
          width: String(width),
          height: String(height),
          output_format: 'png'
        })
      });

      if (!response.ok) {
        return { status: 'failed', error: 'provider_error', detail: `SDXL HTTP ${response.status}` };
      }

      const body = await response.json();
      return {
        status: 'completed',
        assets: [{ data: body.image, mime_type: 'image/png' }],
        job_id: jobId
      };
    }
  };
}

function mapAspectRatioToDims(aspectRatio) {
  switch (aspectRatio) {
    case '16:9':
      return [1344, 768];
    case '9:16':
      return [768, 1344];
    case '3:4':
      return [896, 1152];
    case '4:5':
      return [832, 1216];
    default:
      return [1024, 1024];
  }
}

function toFormData(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}
