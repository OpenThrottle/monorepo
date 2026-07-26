# @openthrottle/openthrottle-drivers

The OpenThrottle-central contract for invoking **agent CLIs** (Claude Code, Codex,
Cursor, Grok, OpenCode). One `defineDriver(...)` call describes a CLI; a shared
execution engine runs it. Adding a new agent is a single module + test, not edits
scattered across `tools/workflows` and the agentic packages.

Extracted and generalized from `tools/workflows/src/bin/run-iteration.ts`. This is a
**Node-only** library (uses `child_process`) — do not import it from browser code.

**Consumed by:** `@tools/workflows` (`run-iteration.ts` adapter),
`@openthrottle/openthrottle-agentic-utils` and `@openthrottle/openthrottle-agentic-workflow`
(runner-id re-exports), and transitively `openthrottle-server`.

## Public API

- **Registry** — `DRIVER_IDS`, `DriverId`, `DEFAULT_DRIVER_ID`, `isDriverId`,
  `parseDriverId`, `getDriver`, `lookupDriver`, `defineDriver`, `ALL_DRIVERS`,
  `DRIVER_REGISTRY`.
- **Types** — `AgentDriver`, `DriverCapabilities`, `DriverInvocationConfig`,
  `DriverWorktreeOptions`, `DriverChunk`.
- **Engine** — `runDriverSync`, `runDriverAsync`, `RunDriverOptions`.
- **Errors** — `UnknownDriverError`, `UnsupportedDriverModeError`.
- **Shell safety** — `escapeForShellDoubleQuoted`, `escapeShellArg`, `WORKTREE_FLAG_ONLY`.
- **Logger** — `DriverLogger`, `noopDriverLogger`.
- **Process** — `escalateKill`, `SIGKILL_GRACE_MS`.

## Usage

```ts
import {
  getDriver,
  parseDriverId,
  runDriverAsync,
} from '@openthrottle/openthrottle-drivers';

const driver = getDriver(parseDriverId('claude'));

const output = await runDriverAsync(
  driver,
  {
    iteration: 1,
    prompt: 'Do the thing.',
    model: 'sonnet',
    timeoutMs: 600_000,
    onChunk: ({ data, stream }) => process[stream].write(data),
  },
  { logger: myDriverLogger }, // optional; defaults to a no-op
);
```

## Capability matrix

| Driver   | id / label              | model flag               | permission flag                 | worktree `-w` | worktree base     | skip setup              |
| -------- | ----------------------- | ------------------------ | ------------------------------- | ------------- | ----------------- | ----------------------- |
| Claude   | `claude` / claude-code  | `--model` (omits `auto`) | `--permission-mode acceptEdits` | yes           | no                | no                      |
| Codex    | `codex` / codex         | `--model` (omits `auto`) | `--sandbox workspace-write`     | no            | no                | no                      |
| Cursor   | `cursor` / cursor-agent | `--model` (any value)    | `--force`                       | yes           | `--worktree-base` | `--skip-worktree-setup` |
| Grok     | `grok` / grok           | `--model` (omits `auto`) | `--permission-mode acceptEdits` | yes           | no¹               | no                      |
| OpenCode | `opencode` / opencode   | `--model` (omits `auto`) | `--auto`                        | no            | no                | no                      |

¹ Grok's worktree-base flag is `--worktree-ref` (not Cursor's `--worktree-base`), so it
advertises `worktreeBase: false` for now — wiring it through the shared formatter (a
per-driver base-flag name) is a follow-up.

Command shapes (byte-identical to the legacy builders for claude/cursor):

- `claude -p --permission-mode acceptEdits "<prompt>" [--model M] [-w [name]]`
- `codex exec --sandbox workspace-write [--model M] "<prompt>"`
- `cursor-agent --force -p "<prompt>" [--model M] [-w [name] [--worktree-base B] [--skip-worktree-setup]]`
- `grok -p "<prompt>" --permission-mode acceptEdits [--model M] [-w [name]]`
- `opencode run --auto "<prompt>" [--model M]`

## Adding a new agent CLI

1. Verify the CLI's headless flags against its own `--help` (never from memory).
2. Add `src/drivers/<id>.ts`:

   ```ts
   import { defineDriver } from '../registry/index.ts';
   import { escapeForShellDoubleQuoted } from '../utils/shell.ts';

   export const geminiDriver = defineDriver({
     buildShellCommand: (config) =>
       `gemini -p "${escapeForShellDoubleQuoted(config.prompt)}"`,
     capabilities: {
       permissionMode: false,
       skipWorktreeSetup: false,
       supportsModelFlag: true,
       worktree: false,
       worktreeBase: false,
     },
     id: 'gemini',
     label: 'gemini',
   });
   ```

3. Add `'gemini'` to `DRIVER_IDS` (registry) and the driver to `ALL_DRIVERS` (drivers barrel).
4. Add a command-construction test (base command, `--model`, prompt/model escaping).
5. If the CLI has no viable headless mode, throw `UnsupportedDriverModeError` from
   `buildShellCommand` instead of shipping a broken command.

Suggested follow-ups: **Gemini CLI** (`gemini`), **GitHub Copilot CLI** (`copilot`);
second tier Amp, Aider, Goose, Qwen Code — each is one `defineDriver` module + test.
