# VSCode and Cursor extension compatibility

This document summarizes whether one extension codebase can target both **VS Code** and **Cursor**, and any differences or constraints. It supports the plan _Investigate VSCode/Cursor extension for OpenThrottle plans and tasks_ and the `@openthrottle/vscode-openthrottle` package.

## One codebase for both: yes

**Cursor is built on VS Code.** It uses the same core (Electron, extension host, and Extension API). Therefore:

- A single extension built with the [VS Code Extension API](https://code.visualstudio.com/api) can run in both editors.
- Package and ship one `.vsix`; users can install it in VS Code or Cursor.
- No Cursor-specific code is required for standard extension features (sidebars, webviews, commands, etc.).

## How to target both

1. **Use only the stable VS Code Extension API** — [Extension API](https://code.visualstudio.com/api), [Contribution Points](https://code.visualstudio.com/api/references/contribution-points), and [UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview).
2. **Declare engine compatibility** — In `package.json`, set `engines.vscode` to a minimum supported version (e.g. `^1.85.0`) so both VS Code and Cursor can load the extension.
3. **Build and package as a normal VS Code extension** — Use `vsce package` (or your build pipeline) to produce a `.vsix`. The same artifact can be installed in either editor.
4. **Test in both** — Run the extension in VS Code and in Cursor (e.g. "Run Extension" from the extension workspace, or install the built `.vsix` in each) to catch environment differences.

## Differences and constraints

| Area                          | Notes                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Marketplace**               | VS Code uses the [VS Code Marketplace](https://marketplace.visualstudio.com/). Cursor may use its own marketplace or allow installing from Open VSX / local `.vsix`. For one codebase, publish the same `.vsix` (e.g. to both marketplaces if Cursor has one, or document sideload/install-from-vsix for Cursor users). |
| **API surface**               | Stick to **stable** VS Code APIs. Avoid **Proposed APIs** or Cursor-only APIs if the goal is a single codebase; otherwise you may need runtime checks or separate builds.                                                                                                                                               |
| **Engine version**            | `engines.vscode` is respected by both. Use a conservative minimum (e.g. `^1.85.0`) so the extension loads in current VS Code and Cursor.                                                                                                                                                                                |
| **Debugging / Run Extension** | Both support "Run Extension" from a workspace; behavior should be the same. Use the same launch config.                                                                                                                                                                                                                 |
| **Theming / UI**              | Same workbench and theming model; no special handling for Cursor unless you rely on Cursor-only UI.                                                                                                                                                                                                                     |

## Summary

- **One codebase:** Yes; use the standard VS Code Extension API and one `.vsix`.
- **Constraints:** Use stable API only; choose a conservative `engines.vscode`; test in both editors; be aware of marketplace/install path differences for Cursor.

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Capabilities Overview](https://code.visualstudio.com/api/extension-capabilities/overview)
- [VS Code Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [Cursor Docs](https://cursor.com/docs) (for Cursor-specific behavior; extension API aligns with VS Code)
