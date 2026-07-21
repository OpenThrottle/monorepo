# Understanding `NX_ISOLATE_PLUGINS`

## What It Is

`NX_ISOLATE_PLUGINS` is a **real Nx environment variable** that controls whether Nx loads project-graph plugins in isolated worker processes. Setting it to `false` forces plugins to load in-process. This workspace requires it for generator commands because `@tools/generators` ships **uncompiled-TypeScript generator factories** (`generators.json` points at `./src/...`), which Nx's isolated plugin workers can't resolve (see `tools/generators/AGENTS.md`). It also doubles as a workaround for sandboxed execution environments where Nx cannot spawn plugin worker processes.

## What It Does

When Nx loads project graph plugins, it attempts to:

1. Spawn a separate **plugin worker process** to load the plugin
2. Communicate with the main Nx daemon via message queues
3. Isolate plugin failures so they don't crash core tooling

Setting `NX_ISOLATE_PLUGINS=false` disables this plugin isolation mechanism, forcing plugins to load in-process instead of in a separate worker.

## Why It's Needed

**Sandboxed environments** (common for AI agents) often have restrictions that prevent:

- Spawning child processes
- Creating worker threads
- Inter-process communication

This causes the error:

```
NX Failed to start plugin worker
```

## When to Use It

**Always use `NX_ISOLATE_PLUGINS=false` when:**

- Running in Cursor/VS Code integrated terminals (sandboxed)
- Running in CI/CD pipelines (containers)
- Running in restricted execution environments
- You encounter "Failed to start plugin worker" errors

**You can use default Nx behavior (omit the flag) when:**

- Running in unrestricted local terminals
- Plugin worker processes can spawn successfully
- You want the performance benefits of plugin isolation

## Performance Implications

- **With isolation (default)**: Better performance, plugin failures don't crash Nx, but requires process spawning
- **Without isolation (`NX_ISOLATE_PLUGINS=false`)**: Works in sandboxed environments, but plugins run in-process (slightly slower, potential for plugin errors to affect Nx)

For generator execution, the performance difference is negligible.

## Recommended Default for Agents

Since **sandboxed execution is the common case for AI agents**, we recommend:

1. **Set as default in VS Code/Cursor settings** (see below)
2. **Always use in agent code examples**
3. **Document as the recommended approach for agent workflows**

## Configuration Options

### Option 1: VS Code/Cursor Terminal Environment (Recommended for Agents)

Add to `.vscode/settings.json`:

```json
{
  "terminal.integrated.env.osx": {
    "NX_ISOLATE_PLUGINS": "false"
  },
  "terminal.integrated.env.linux": {
    "NX_ISOLATE_PLUGINS": "false"
  },
  "terminal.integrated.env.windows": {
    "NX_ISOLATE_PLUGINS": "false"
  }
}
```

**Pros:**

- Applies automatically to all terminal sessions
- Only affects terminals in VS Code/Cursor
- Doesn't affect other Nx commands outside the editor

**Cons:**

- Only works in VS Code/Cursor terminals
- Requires workspace settings file

### Option 2: Shell Profile (Not Recommended)

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export NX_ISOLATE_PLUGINS=false
```

**Pros:**

- Works in all terminals

**Cons:**

- Affects ALL Nx commands system-wide
- May cause issues if you need plugin isolation elsewhere
- Not workspace-specific

### Option 3: Per-Command Prefix (Current Approach)

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router ...
```

**Pros:**

- Explicit and clear
- Only affects specific commands
- No global configuration needed

**Cons:**

- Must remember to add to every command
- Verbose
- Easy to forget

### Option 4: Wrapper Script (Alternative)

Create a script that automatically adds the flag:

```bash
#!/usr/bin/env sh
NX_ISOLATE_PLUGINS=false pnpm nx "$@"
```

**Pros:**

- Centralized configuration
- Can be aliased for convenience

**Cons:**

- Requires maintaining a script
- Less discoverable

## Recommendation for This Workspace

**For AI Agent Use Cases:**

1. ✅ **Set in VS Code settings** (Option 1) - This makes it automatic for agents using Cursor
2. ✅ **Update documentation** to recommend this as the default
3. ✅ **Keep per-command examples** for clarity and as fallback

**For Human Developers:**

- Let them choose based on their environment
- Document when to use it
- Provide troubleshooting guidance

## References

- [Nx Project Graph Plugins](https://nx.dev/docs/extending-nx/project-graph-plugins)
- [Nx Environment Variables](https://nx.dev/docs/reference/environment-variables)
- [Troubleshooting Guide](./TROUBLESHOOTING.md#issue-plugin-worker-fails)
