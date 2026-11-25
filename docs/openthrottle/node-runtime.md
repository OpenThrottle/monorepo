# Which Node OpenThrottle runs on

OpenThrottle pins its runtime in the root `package.json` (`engines.node`, currently `>=26`) and in
`.nvmrc` (the exact version). The shell you start OT from often has another Node: an agent's Bash tool
gets nvm's _default_ alias, the Claude desktop app lists every nvm install oldest-first, and `nvm use`
does not exist in a non-interactive shell. So each way OT runs either picks its own Node or refuses to
start on the wrong one, with the fix printed.

## The matrix

| How OT runs                                                                                       | Which Node it uses                                                                                                                                                                                                                                  | If it doesn't fit                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop app** (`openthrottle-app`)                                                              | Electron's bundled Node (Electron 45.3.1 ships Node 24.22.2). Its `utilityProcess` hosts the developer production server, not `openthrottle-server`, so root `engines.node` does not apply.                                                         | `electron-bundled-node.test.ts` fails on an Electron bump until the bundled Node is recorded, and fails when it drops below the `engines.node` of what the embedded server loads. |
| **MCP server** (`scripts/run-openthrottle-mcp.sh`)                                                | Resolved: `OT_NODE` / `OT_MCP_NODE`, then the `.nvmrc` install, then the newest nvm install that fits, then PATH's `node`.                                                                                                                          | Exits 1 naming the range and everything it tried. Details: [openthrottle-mcp README § Launcher Node version](../../packages/openthrottle-mcp/README.md#launcher-node-version).    |
| **Plugin hooks and bin CLIs** (`plugins/*/hooks/*.cjs`, `plugins/*/bin/*.cjs`)                    | They run in **your own repos**, on whatever `node` the agent has. Below Node 22 (the bundles' compile target), a stub re-runs its bundle on `OT_NODE`, the newest nvm install, or a new-enough PATH `node`. The host repo's `.nvmrc` is never read. | Exits 0 silently: a hook must never break the tool call it observes.                                                                                                              |
| **Server and worker from source** (`pnpm nx run openthrottle-server:dev\|dev-api\|worker\|start`) | The shell's `node`.                                                                                                                                                                                                                                 | The `monorepo:ensure-node` gate fails first, printing `export PATH="<the right bin>:$PATH"`. A built `main.js` started directly refuses Node below 26 with the same pointer.      |
| **Docker images**                                                                                 | Pinned in the image (distroless `nodejs26`).                                                                                                                                                                                                        | n/a                                                                                                                                                                               |
| **`pnpm install` in this repo**                                                                   | The shell's `node`.                                                                                                                                                                                                                                 | `preinstall` (`scripts/check-node-engine.mjs`) fails and prints the PATH export for an installed Node that fits, or `nvm install`.                                                |
| **Worktrees OT creates for your repos** (plan runs, `worktree:new`)                               | **Your** repo's Node: `create.sh` / `heal.sh` resolve it from the checkout's `engines.node` and `.nvmrc` and put it first on PATH for the provisioner. A repo without `engines.node` keeps the caller's Node.                                       | Fails before `git worktree add`, printing what it tried. Override with `OT_NODE`, opt out with `OPENTHROTTLE_WORKTREE_NODE=0`, or do anything else in `.worktree/provision.sh`.   |

The resolver behind the MCP launcher, the worktree scripts and the `ensure-node` gate is one bash file,
[`skills/ot-worktree/scripts/resolve-node.sh`](../../skills/ot-worktree/scripts/resolve-node.sh). It
takes about 6 ms, never sources `nvm.sh`, and its range grammar is tested against
`check-node-engine.mjs`.

## Contributor tip: let pnpm pick `node` in every shell

pnpm 12.7+ can install a global `node` shim that reads the nearest `.nvmrc`, so a bare `node` inside
this repo is Node 26 in every shell, agent and terminal alike, and your global Node everywhere else.
It costs about 10–15 ms per call, and the first call downloads the pinned Node into the pnpm store
(signature-verified). This is optional, and it is your machine's setup, not the repo's:

```bash
pnpm add -g node
```

For it to take effect, `$PNPM_HOME/bin` must come **before** nvm's `bin` on PATH. Check with
`which -a node`: the first entry should be under `$PNPM_HOME/bin`. With nvm initialised after pnpm in
your shell profile, nvm's default wins and the shim does nothing.
