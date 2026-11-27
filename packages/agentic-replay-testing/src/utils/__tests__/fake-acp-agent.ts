/**
 * A real child process that speaks just enough ACP for the recording tests: a
 * node script written to disk, so the shim and the recorder spawn it exactly
 * as they would the real agent. It never touches cursor-agent or agy.
 *
 * Behavior: `--version` prints `1.2.3`. Otherwise newline-delimited JSON-RPC:
 * `initialize`, `session/new` and `session/load` answer (with a `_meta`, and
 * the session id a UUID); `session/prompt` streams two `session/update`s and
 * finishes with `end_turn`; a prompt containing `ASK` first raises one
 * agent-originated `session/request_permission` (id 900) and waits for the
 * reply (a prompt naming the file-writing tool does too); a prompt that asks
 * to count to 300 streams one update and waits for `session/cancel`, then
 * ends with `cancelled`. Any other request answers `{}`. A non-JSON banner goes to stdout and
 * a line to stderr at startup, plus the banner when started with `--banner`. It exits 0 when stdin closes, so a test ends it
 * by ending stdin.
 */

import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The session id the fake mints; a UUID, so the sanitizer maps it. */
export const FAKE_SESSION_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const SCRIPT = `#!${process.execPath}
import { createInterface } from 'node:readline';

if (process.argv.includes('--version')) {
  process.stdout.write('1.2.3\\n');
  process.exit(0);
}

const SESSION_ID = ${JSON.stringify(FAKE_SESSION_ID)};
const send = (message) => {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\\n');
};
const update = (text) => {
  send({
    method: 'session/update',
    params: {
      sessionId: SESSION_ID,
      update: { content: { text, type: 'text' }, sessionUpdate: 'agent_message_chunk' },
    },
  });
};

let pendingPrompt = null;
let slowPrompt = null;
const finish = (id) => {
  update('ng');
  send({ id, result: { stopReason: 'end_turn' } });
};

if (process.argv.includes('--banner')) process.stdout.write('fake-acp banner (not json)\\n');
process.stderr.write('fake-acp ready in ' + process.cwd() + '\\n');

const lines = createInterface({ input: process.stdin });
lines.on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'session/cancel' && slowPrompt !== null) {
    send({ id: slowPrompt, result: { stopReason: 'cancelled' } });
    slowPrompt = null;
    return;
  }
  if (message.method === undefined && message.id === 900) {
    if (pendingPrompt !== null) finish(pendingPrompt);
    pendingPrompt = null;
    return;
  }
  if (message.id === undefined || message.method === undefined) return;
  if (message.method === 'initialize') {
    send({
      id: message.id,
      result: { _meta: { build: 'x' }, agentCapabilities: { loadSession: true }, authMethods: [], protocolVersion: 1 },
    });
  } else if (message.method === 'session/new') {
    send({ id: message.id, result: { _meta: { cwd: message.params.cwd }, sessionId: SESSION_ID } });
  } else if (message.method === 'session/load') {
    update('replayed history');
    send({ id: message.id, result: {} });
  } else if (message.method === 'session/prompt') {
    update('po');
    const params = JSON.stringify(message.params);
    if (params.includes('Count from 1 to 300')) {
      slowPrompt = message.id;
    } else if (params.includes('ASK') || params.includes('file-writing tool')) {
      pendingPrompt = message.id;
      send({
        id: 900,
        method: 'session/request_permission',
        params: {
          options: [
            { kind: 'allow_once', name: 'Allow', optionId: 'allow' },
            { kind: 'reject_once', name: 'Reject', optionId: 'reject' },
          ],
          sessionId: SESSION_ID,
          toolCall: { kind: 'execute', title: 'Run ls', toolCallId: 'tool-1' },
        },
      });
    } else {
      finish(message.id);
    }
  } else {
    send({ id: message.id, result: {} });
  }
});
lines.on('close', () => process.exit(0));
`;

/** Write the fake agent into `dir` and return its absolute path. */
export function writeFakeAcpAgent(dir: string): string {
  const path = join(dir, 'fake-acp-agent.mjs');
  writeFileSync(path, SCRIPT, 'utf8');
  chmodSync(path, 0o755);
  return path;
}
