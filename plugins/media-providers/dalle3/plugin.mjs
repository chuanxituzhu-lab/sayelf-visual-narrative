// DALL-E 3 provider — fallback route in the illustrator degradation chain.
// Used automatically by interfaces/api when the flux provider returns
// status: 'failed' (see config/media-providers.json priority ordering).
//
// Required environment variable:
//   OPENAI_API_KEY - your OpenAI API key

export function createProvider() {
  return {
    async submit({ jobId, request }) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { status: 'failed', error: 'missing_credentials', detail: 'Set OPENAI_API_KEY before using this provider.' };
      }
      if (request.mode !== 'text_to_image') {
        return { status: 'failed', error: 'unsupported_mode', detail: `dalle3 only supports text_to_image, got ${request.mode}` };
      }

      const size = mapAspectRatioToSize(request.aspect_ratio);
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: request.prompt,
          size,
          n: 1,
          response_format: 'b64_json'
        })
      });

      if (!response.ok) {
        return { status: 'failed', error: 'provider_error', detail: `DALL-E 3 HTTP ${response.status}` };
      }

      const body = await response.json();
      // DALL-E 3 is synchronous: the asset is already available.
      return {
        status: 'completed',
        assets: [{ data: body.data[0].b64_json, mime_type: 'image/png' }],
        job_id: jobId
      };
    }
  };
}

function mapAspectRatioToSize(aspectRatio) {
  // DALL-E 3 only supports these three fixed sizes; snap the requested
  // aspect ratio to the closest supported shape rather than failing.
  switch (aspectRatio) {
    case '16:9':
      return '1792x1024';
    case '9:16':
    case '3:4':
      return '1024x1792';
    default:
      return '1024x1024';
  }
}
