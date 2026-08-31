import { compileCanonicalPrompt } from '../../core/compiler.mjs';

export const genericProvider = {
  id: 'generic',
  compile(spec, options = {}) {
    return {
      provider: 'generic',
      prompt: compileCanonicalPrompt(spec, options.language),
      metadata: { mode: spec.mode }
    };
  }
};
