/**
 * A stand-in `claude` whose API org has no credit: it prints the stream-json a
 * real `claude -p … --output-format stream-json --verbose` prints when every
 * request fails with `billing_error` ("Credit balance is too low"), then exits
 * 1.
 *
 * A credit-exhausted org cannot be recorded on demand, so the
 * `plan-run-account-error` scenario names this stub (`synthetic`), and
 * `scripts/record.ts` records it here instead of against the real CLI:
 *
 *   pnpm nx run agentic-replay-testing:record -- --backend claude \
 *     --scenario plan-run-account-error
 *
 * The recorder still drives the real orchestrator and drivers engine, so the
 * argv in the transcript is exactly what production sends; only the CLI's
 * reply is hand-built. Its event shapes mirror a captured incident transcript
 * (an assistant `isApiErrorMessage` with `error`, then an `is_error` result),
 * and the init event reports `apiKeySource: ANTHROPIC_API_KEY` — the
 * credential that billed the empty org in that incident.
 *
 * Node built-ins only: this runs under Node's type stripping, outside Vite.
 */

const SESSION_ID = '8e9f0a1b-2c3d-4e5f-8a6b-7c8d9e0f1a2b';
const CLI_VERSION = '2.1.319';
const ERROR_TEXT = 'Credit balance is too low';
const EMPTY_USAGE = {
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  input_tokens: 0,
  output_tokens: 0,
};

/** Entry point called by the bin `scripts/record.ts` writes for this stub. */
export function runSyntheticCli(): void {
  if (process.argv.includes('--version')) {
    process.stdout.write(
      `${CLI_VERSION} (Claude Code; synthetic credit-exhausted stub)\n`,
    );
    return;
  }

  const events = [
    {
      apiKeySource: 'ANTHROPIC_API_KEY',
      claude_code_version: CLI_VERSION,
      cwd: process.cwd(),
      mcp_servers: [],
      model: 'claude-sonnet-5-5',
      output_style: 'default',
      permissionMode: 'acceptEdits',
      session_id: SESSION_ID,
      subtype: 'init',
      tools: [],
      type: 'system',
      uuid: '3e4f5061-7283-494a-b5c6-d7e8f90a1b2c',
    },
    {
      error: 'billing_error',
      isApiErrorMessage: true,
      message: {
        container: null,
        content: [{ text: ERROR_TEXT, type: 'text' }],
        context_management: null,
        id: '9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f',
        model: '<synthetic>',
        role: 'assistant',
        stop_reason: 'stop_sequence',
        stop_sequence: '',
        type: 'message',
        usage: EMPTY_USAGE,
      },
      parent_tool_use_id: null,
      session_id: SESSION_ID,
      type: 'assistant',
      uuid: '4f506172-8394-4a5b-86d7-e8f90a1b2c3d',
    },
    {
      api_error_status: 400,
      duration_api_ms: 0,
      duration_ms: 388,
      is_error: true,
      modelUsage: {},
      num_turns: 1,
      permission_denials: [],
      result: ERROR_TEXT,
      session_id: SESSION_ID,
      stop_reason: 'stop_sequence',
      subtype: 'success',
      total_cost_usd: 0,
      type: 'result',
      usage: EMPTY_USAGE,
      uuid: '50617283-94a5-4b6c-97e8-f90a1b2c3d4e',
    },
  ];

  for (const event of events) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
  process.exitCode = 1;
}
