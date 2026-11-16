/**
 * @description Pure helpers for the server's embedder (OT plans 165e86ef, 7803080c).
 */

import type { LexicalOnlyBannerInput } from './embedder.types.ts';

const RULE = '═'.repeat(78);

function fixLines(provider: string): readonly string[] {
  if (provider !== 'local') {
    return [
      `  Fix: check that EMBEDDING_PROVIDER=${provider} is reachable and configured.`,
    ];
  }

  return [
    '  Fix: pnpm run embeddings:download-model -- --verify',
    '  (server boots retry it automatically; a running server picks the weights up without a restart)',
  ];
}

/**
 * @description The boot-log block printed when semantic search is off: a boxed, multi-line block
 * rather than one error line, because one line among the hundreds a dev boot prints is how a
 * missing model went unnoticed. Only the local provider reads weights from disk, so only it is
 * told to download them.
 */
export function formatLexicalOnlyBanner(input: LexicalOnlyBannerInput): string {
  return [
    RULE,
    '  SEMANTIC SEARCH IS OFF: search answers by keyword only.',
    `  Embedder ${input.state} (${input.provider}): ${input.detail}`,
    '',
    ...fixLines(input.provider),
    RULE,
  ].join('\n');
}
