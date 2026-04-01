# vscode-openthrottle

OpenThrottle plans and tasks extension for VS Code and Cursor. One codebase targets both editors; see [VSCode and Cursor extension compatibility](../../../docs/openthrottle/vscode-cursor-extension-compatibility.md) for details.

## Prerequisites

The extension reads plans and tasks from **openthrottle-server** (GraphQL). You must have openthrottle-server running; the default base URL is `http://localhost:6021`. Configure `openthrottle.apiBaseUrl` in VS Code/Cursor settings if your API runs elsewhere. See [docs/INTEGRATION.md](./docs/INTEGRATION.md) for the read path and configuration.

## UI design

The extension UI is defined in [docs/UI-DESIGN.md](./docs/UI-DESIGN.md): sidebar view container (OpenThrottle), Plans tree (plans by status with tasks), and a read-only detail view (webview or panel) for the selected plan or task.

## Local installation (extension not published)

The package is private and lives only in this monorepo. Use one of these ways to run or install it locally.

### Option 1: Run from source (development)

1. Build the extension from the repo root:

   ```bash
   pnpm nx build @openthrottle/vscode-openthrottle
   ```

2. In VS Code or Cursor, **File → Open Folder** and open `packages/openthrottle/vscode-openthrottle`.
3. Press **F5** (or **Run → Start Debugging**) to launch a new editor window with the extension loaded.

Use this when you’re changing the extension; the Extension Development Host uses the built `dist/` output.

### Option 2: Install from a .vsix (sideload)

1. Build and package from the repo root:

   ```bash
   pnpm nx build @openthrottle/vscode-openthrottle
   cd packages/openthrottle/vscode-openthrottle && pnpm exec vsce package --no-dependencies
   ```

   This creates a `.vsix` file in `packages/openthrottle/vscode-openthrottle/`.

2. Install in **VS Code** or **Cursor**:
   - Open the Extensions view (e.g. **Cmd+Shift+X** / **Ctrl+Shift+X**).
   - Click the **...** menu at the top of the Extensions panel.
   - Choose **Install from VSIX...** and select the `.vsix` file.

   Alternatively, from a terminal (VS Code: `code`, Cursor: `cursor`):

   ```bash
   code --install-extension ./packages/vscode-openthrottle/openthrottle.vsix
   # or
   cursor --install-extension ./packages/vscode-openthrottle/openthrottle.vsix
   ```

The extension will then be installed until you uninstall it or install a newer .vsix. Re-run the build and `vsce package` steps after code changes.
