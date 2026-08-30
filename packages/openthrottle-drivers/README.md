# @openthrottle/openthrottle-drivers

The OpenThrottle-central contract for invoking **agent CLIs** (Claude Code, Codex,
Cursor, Gemini, Grok, OpenCode). One `defineDriver(...)` call describes a CLI; a shared
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
| Gemini   | `gemini` / gemini       | `--model` (omits `auto`) | `--approval-mode yolo`          | no            | no                | no                      |
| Grok     | `grok` / grok           | `--model` (omits `auto`) | `--permission-mode acceptEdits` | yes           | no¹               | no                      |
| OpenCode | `opencode` / opencode   | `--model` (omits `auto`) | `--auto`                        | no            | no                | no                      |

¹ Grok's worktree-base flag is `--worktree-ref` (not Cursor's `--worktree-base`), so it
advertises `worktreeBase: false` for now — wiring it through the shared formatter (a
per-driver base-flag name) is a follow-up.

Command shapes (byte-identical to the legacy builders for claude/cursor):

- `claude -p --permission-mode acceptEdits "<prompt>" [--model M] [-w [name]]`
- `codex exec --sandbox workspace-write [--oss … | -c model_providers.…] [--model M] "<prompt>"`
- `cursor-agent --force -p "<prompt>" [--model M] [-w [name] [--worktree-base B] [--skip-worktree-setup]]`
- `gemini --approval-mode yolo "<prompt>" [--model M] < /dev/null` (the redirect is load-bearing:
  with a non-TTY stdin the CLI blocks reading it to EOF; the positional prompt is used because
  `-p` is deprecated in 0.25.2)
- `grok -p "<prompt>" --permission-mode acceptEdits [--model M] [-w [name]]`
- `opencode run --auto "<prompt>" [--model M]`

## Endpoint targeting (local servers and remote gateways)

`DriverInvocationConfig.endpoint` points a driver at an OpenAI-compatible endpoint other
than its own cloud provider. `endpoint.kind` selects which — omitted means `local`, so
existing callers are unchanged.

| Driver   | `supportsCustomBaseUrl` | local endpoint                                                                | remote gateway (OpenRouter)                                                  |
| -------- | ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| OpenCode | yes                     | `OPENCODE_CONFIG=<file>` defining an `openai-compatible` provider             | same file, native `openrouter` provider; models are `openrouter/<slug>`      |
| Codex    | yes                     | `--oss --local-provider <ollama\|lmstudio> -c model_providers.oss.base_url=…` | own `[model_providers.openthrottle_remote]` via `-c`, `wire_api="responses"` |
| Grok     | yes                     | `GROK_MODELS_BASE_URL` + `XAI_API_KEY`                                        | **no** — no base-url flag or env var (verified `grok --help`)                |
| Claude   | no                      | —                                                                             | **no** — Anthropic Messages API, not OpenAI-compatible                       |
| Cursor   | no                      | —                                                                             | **no** — proprietary backend, Cursor-hosted models                           |
| Gemini   | no                      | —                                                                             | **no** — Gemini API                                                          |

Which CLIs can and cannot run through OpenRouter is a permanent property of their wire
protocols, not a TODO. Claude Code's third-party providers are Bedrock/Vertex/Foundry;
`cursor-agent --api-key` takes a _Cursor_ key against Cursor-hosted models.

Two things verified against the installed CLIs on 2026-08-29 that a reader would
otherwise get wrong:

- **codex must use `wire_api = "responses"`.** 0.145.0 rejects `wire_api = "chat"` at
  config-load time; OpenRouter does serve `POST /api/v1/responses`, so the generated
  provider routes. The built-in `--oss` provider cannot be reused — it owns an
  ollama/lmstudio wire adapter.
- **A stored ChatGPT login in `~/.codex` shadows the provider's `env_key`.** On such a
  host the run authenticates through codex's own auth manager instead of the supplied
  key. A consumer needing a guaranteed gateway identity must run with a dedicated
  `CODEX_HOME`.

The leaf builders stay pure throughout: the key reaches the subprocess through an env
assignment codex resolves by name (`env_key`) or a consumer-materialized config file
(opencode), never as a CLI argv token. The env assignment is still part of the
`shell: true` command string, so treat that string as sensitive.

## Adding a new agent CLI

1. Verify the CLI's headless flags against its own `--help` (never from memory).
2. Add `src/drivers/<id>.ts`:

   ```ts
   import { defineDriver } from '../registry/index.ts';
   import { escapeForShellDoubleQuoted } from '../utils/shell.ts';

   export const copilotDriver = defineDriver({
     buildShellCommand: (config) =>
       `copilot -p "${escapeForShellDoubleQuoted(config.prompt)}"`,
     capabilities: {
       permissionMode: false,
       skipWorktreeSetup: false,
       supportsModelFlag: true,
       worktree: false,
       worktreeBase: false,
     },
     id: 'copilot',
     label: 'copilot',
   });
   ```

3. Add `'copilot'` to `DRIVER_IDS` (registry) and the driver to `ALL_DRIVERS` (drivers barrel).
4. Add a command-construction test (base command, `--model`, prompt/model escaping).
5. If the CLI has no viable headless mode, throw `UnsupportedDriverModeError` from
   `buildShellCommand` instead of shipping a broken command.

Suggested follow-ups: **GitHub Copilot CLI** (`copilot`); second tier Amp, Aider,
Goose, Qwen Code — each is one `defineDriver` module + test. (Gemini CLI landed as
`src/drivers/gemini.ts` — dossier in `docs/openthrottle/gemini-stream-json-schema.md`.)
