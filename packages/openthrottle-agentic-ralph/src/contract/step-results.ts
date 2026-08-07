/**
 * @description Outcome of interpreting `<promise>…</promise>` / terminal markers in agent output.
 */
export type AgentOutputControlType =
  'COMPLETE' | 'ERROR' | 'INPUT_REQUIRED' | 'NONE';
