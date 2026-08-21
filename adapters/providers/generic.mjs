import { compileCanonicalPrompt } from '../../core/compiler.mjs';

export const genericProvider = {
  id: 'generic',
  compile(spec) {
    return {
      provider: 'generic',
      prompt: compileCanonicalPrompt(spec),
      metadata: { mode: spec.mode }
    };
  }
};
