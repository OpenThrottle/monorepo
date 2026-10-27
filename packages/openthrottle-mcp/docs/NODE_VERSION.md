# Node version for the stdio launcher

`scripts/run-openthrottle-mcp.sh` chooses its own Node instead of trusting the first `node` on the PATH an MCP client hands it. This page covers the failure that made that necessary, how the choice is made, and how to override it.

## Symptom

Before the launcher pinned Node, a client could fail like this while everything looked healthy:

- The **Claude desktop app** shows `openthrottle-mcp` as **"Connection closed"**, while the same registration works from the `claude` CLI in a terminal.
- The MCP log shows the launcher starting on an old Node and blaming the server, although `curl http://localhost:6021/health` answers:

  ```text
  🔍 Using Node.js version: v16.17.1
  …
  ✗ openthrottle-mcp: no reachable OpenThrottle server found.
  ```

- Under a bare environment (`env -i`), the shim exits **127** because there is no `node` at all.

## Cause

MCP clients launch servers with **their own PATH**, not your shell's. The Claude desktop app builds it from every nvm install in ascending order, so `node` resolves to the **oldest** one, whatever your nvm default is. The CLI works because it inherits a terminal where nvm has already selected the right version.

Node 16 has no global `fetch`. The launcher's server probe called it, the resulting `ReferenceError` was swallowed by a bare `catch`, and every candidate server was reported unreachable.

## How the launcher picks Node now

Before it starts tsx, the shim resolves a Node that satisfies the root `package.json` `engines.node`, puts that Node's `bin` directory at the front of `PATH`, and then `exec`s tsx. tsx's `#!/usr/bin/env node` and the server child the launcher spawns both run on it. First hit wins:

1. **`OT_MCP_NODE`**: an explicit node binary (see [Overriding](#overriding)).
2. **The `.nvmrc` version** at `$NVM_DIR/versions/node/v<version>` (`$NVM_DIR` defaults to `~/.nvm`). The checkout's own `.nvmrc` is used, or the primary checkout's when a worktree has none. Only an exact `x.y.z` is looked up, so aliases such as `lts/*` move on to the next step.
3. **The newest nvm install** that satisfies `engines.node`.
4. **The `node` on PATH**, if its version satisfies `engines.node`.

If nothing fits, the shim exits 1 with one stderr line naming the range and everything it tried:

```text
🔴 run-openthrottle-mcp: no Node satisfying engines.node ">=22.22.3 <23 || >=24.15 <25 || >=26" — tried: .nvmrc v24.18.0 (not installed in /Users/you/.nvm); none of 3 nvm installs in /Users/you/.nvm; PATH node /usr/local/bin/node v20.11.0. …
```

Resolution is plain bash ([`scripts/utils/resolve-node.sh`](../../../scripts/utils/resolve-node.sh)). It takes about 6 ms, never sources `nvm.sh` (about 210 ms, and `nvm use` prints to stdout), and writes nothing to stdout, which carries only JSON-RPC. Its range parser matches the `pnpm install` guard in [`scripts/check-node-engine.mjs`](../../../scripts/check-node-engine.mjs), and the tests check that the two agree.

If the shim is bypassed, for example by running the `.ts` with tsx directly on an old Node, `run-openthrottle-mcp.ts` checks `engines.node` itself. It refuses to start with a banner that names the running version and the required range, and it does so before probing any server. Its probe now treats only real network failures and timeouts as "unreachable", so a broken runtime can no longer be reported as a down server.

## Overriding

Pin a specific binary with **`OT_MCP_NODE`** in the client config's `env` block. It wins over everything else. It must still satisfy `engines.node`; if it doesn't, the launcher fails rather than quietly choosing a different Node.

```bash
claude mcp add-json openthrottle-mcp --scope user '{"command":"bash","args":["/abs/path/to/monorepo/scripts/run-openthrottle-mcp.sh"],"env":{"OT_MCP_NODE":"/Users/you/.nvm/versions/node/v24.18.0/bin/node"}}'
```

For Cursor, add the same `"env": { "OT_MCP_NODE": "…" }` to the server's entry in `~/.cursor/mcp.json`.

The other inputs:

- **`PATH`** in the `env` block only matters when no nvm install fits (step 4). Use it when you manage Node without nvm, for example with Homebrew, fnm, Volta or mise; their shims or binaries just need to be on that PATH.
- **`NVM_DIR`** in the `env` block points the lookup at an nvm that is not in `~/.nvm`.

[`scripts/setup_mcp-instructions.ts`](../../../scripts/setup_mcp-instructions.ts) still emits no `env` block. The launcher resolves Node by itself, and writing a `PATH` into a user-global config would freeze one machine's install list there, where it goes stale after the next `nvm install`.

## Diagnosing

Run the launcher the way a client does. The first stderr line names the Node it chose:

```bash
env -i HOME="$HOME" OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh
```

To reproduce the desktop app's PATH, put an old Node first:

```bash
PATH="$HOME/.nvm/versions/node/v16.17.1/bin:$PATH" OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh
```

Both should report the `.nvmrc` version. MCP servers register when a session starts, so after you change the launcher or its config, reconnect the server (`/mcp` in Claude Code) or restart the client.
