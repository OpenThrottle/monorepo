import { describe, expect, it } from 'vitest';
import * as packageExports from './index.js';

/**
 * Pins the package's runtime re-export surface so an accidental drop or rename
 * in `src/index.ts` (or any of the barrel files it forwards) is caught here
 * rather than only at a downstream consumer's build.
 */
describe('@openthrottle/openthrottle-workflows public surface', () => {
  const exported: Readonly<Record<string, unknown>> = { ...packageExports };

  it.each([
    'formatPlanAndTasksForPrompt',
    'getRalphOutputMarkerFlags',
    'parseRalphAgentParseControl',
    'parseRalphCompleteTaskSignals',
    'ralphOutputHasPromiseComplete',
  ])('re-exports %s as a function', (name) => {
    expect(typeof exported[name]).toBe('function');
  });
});
