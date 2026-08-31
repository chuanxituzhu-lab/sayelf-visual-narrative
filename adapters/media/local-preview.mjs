export function createProvider() {
  return {
    id: 'local-preview',
    transport: 'local',
    configured: true,
    ready: false,
    async submit({ request }) {
      const prompts = request.prompts?.length ? request.prompts : [request.prompt].filter(Boolean);
      return {
        status: 'awaiting_assistant',
        message: 'No media API is configured. Send the compiled prompt package to an enabled AI assistant or connect a media provider.',
        assistant_prompt: prompts.join('\n\n')
      };
    }
  };
}
