import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { agentCliSpawnChokepoint } from '../rules/agentCliSpawnChokepoint.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const ELSEWHERE = '/repo/applications/openthrottle-server/src/run-agent.ts';

ruleTester.run('agent-cli-spawn-chokepoint', agentCliSpawnChokepoint, {
  invalid: [
    {
      code: "import { spawn } from 'node:child_process';\nspawn('claude', ['-p', prompt]);",
      errors: [{ data: { binary: 'claude' }, messageId: 'agentCliSpawn' }],
      filename: ELSEWHERE,
    },
    {
      // Shell string: the first word is the binary.
      code: "import { execSync } from 'child_process';\nexecSync('codex exec --json');",
      errors: [{ data: { binary: 'codex' }, messageId: 'agentCliSpawn' }],
      filename: ELSEWHERE,
    },
    {
      // Namespace import, absolute path, same-file const.
      code: "import * as cp from 'node:child_process';\nconst BIN = '/usr/local/bin/gemini';\ncp.spawnSync(BIN, []);",
      errors: [{ data: { binary: 'gemini' }, messageId: 'agentCliSpawn' }],
      filename: ELSEWHERE,
    },
    {
      // Template literal head.
      code: "import { exec } from 'node:child_process';\nexec(`cursor-agent -p ${prompt}`);",
      errors: [
        { data: { binary: 'cursor-agent' }, messageId: 'agentCliSpawn' },
      ],
      filename: ELSEWHERE,
    },
    {
      // promisify(execFile) is still a spawner.
      code: "import { execFile } from 'node:child_process';\nimport { promisify } from 'node:util';\nconst run = promisify(execFile);\nawait run('opencode', ['run']);",
      errors: [{ data: { binary: 'opencode' }, messageId: 'agentCliSpawn' }],
      filename: ELSEWHERE,
    },
    {
      code: "import { execa, $ } from 'execa';\nawait execa('grok', ['-p']);\nawait $`agy chat`;",
      errors: [
        { data: { binary: 'grok' }, messageId: 'agentCliSpawn' },
        { data: { binary: 'agy' }, messageId: 'agentCliSpawn' },
      ],
      filename: ELSEWHERE,
    },
    {
      code: "import spawn from 'cross-spawn';\nspawn('claude', []);",
      errors: [{ data: { binary: 'claude' }, messageId: 'agentCliSpawn' }],
      filename: ELSEWHERE,
    },
  ],
  valid: [
    {
      code: "import { spawn } from 'node:child_process';\nspawn('claude', ['-p', prompt]);",
      filename: '/repo/packages/openthrottle-drivers/src/engine/index.ts',
    },
    {
      code: "import { spawn } from 'node:child_process';\nspawn('claude', []);",
      filename: `/repo/packages/openthrottle-agentic-utils/src/utils/conversation-backend/claude/claude.ts`,
    },
    {
      // Non-agent binaries are out of scope.
      code: "import { spawnSync } from 'node:child_process';\nspawnSync('git', ['status']);",
      filename: ELSEWHERE,
    },
    {
      // A binary resolved at runtime cannot be seen.
      code: "import { spawn } from 'node:child_process';\nspawn(resolveBin(), []);",
      filename: ELSEWHERE,
    },
    {
      // `let` can be reassigned, so it is not resolved.
      code: "import { spawn } from 'node:child_process';\nlet bin = 'claude';\nspawn(bin, []);",
      filename: ELSEWHERE,
    },
    {
      // A local `spawn` that is not child_process.
      code: "const spawn = (name: string) => name;\nspawn('claude');",
      filename: ELSEWHERE,
    },
    {
      // A binary whose name only starts with an agent's.
      code: "import { spawn } from 'node:child_process';\nspawn('claude-helper', []);",
      filename: ELSEWHERE,
    },
  ],
});
