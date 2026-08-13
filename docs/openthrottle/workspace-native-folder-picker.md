# Workspace add-folder: native OS picker + in-app fallback (design decision)

Design decision for the `/settings/workspace` "Add a folder" Browse rework
(OT plan `f0d2ad9d`). Resolves the two open questions before implementation:
how the server decides it may open a native OS folder dialog, and which
per-OS commands return an absolute host path with clean cancel/timeout
semantics. Referenced by the server tasks (`workspacePickerCapabilities`,
`pickFolderNative`, enriched `browseDirectory`).

## Design-defining constraint

Workspace folders live on the **openthrottle-server host**, not the browser.
Browser folder pickers deliberately hide absolute filesystem paths:

- `<input type="file" webkitdirectory>` exposes only `webkitRelativePath`
  (folder name + relative subpaths), never the absolute directory.
- `window.showDirectoryPicker()` returns an opaque `FileSystemDirectoryHandle`
  with a `name` only — no path, by spec, for privacy.

Neither can produce a server-usable absolute path, **even when the browser and
server are the same machine**. So the "native OS folder dialog" must be a
**server-side** dialog: the server shells out to the host's OS picker, the
dialog appears on the user's own screen (because it _is_ the same machine), and
the chosen absolute host path flows straight into `addWorkspaceFolder`.

**Dead end — do not reimplement:** a client-side `webkitdirectory` /
`showDirectoryPicker()` picker. It cannot yield an absolute path and is a trap
for a future contributor. This file exists partly to record that.

## Decision 1 — same-machine / native-availability predicate

`canUseNativeDialog` is computed **per request**, conservative by default
(native OFF unless the request is clearly local _and_ a display is present).
Order of evaluation:

1. **Explicit override (`OPENTHROTTLE_NATIVE_PICKER`)** wins in both directions:
   - `0` / `false` / `off` → native force-**disabled** (return `false`).
   - `1` / `true` / `on` → native force-**enabled** (skip the loopback/display
     checks; for operators who front the server with a trusted local proxy or
     know their deployment is a local GUI box).
   - unset / any other value → fall through to the computed default.
2. **Loopback check (raw socket, not headers).** The request's transport peer
   address must be loopback: `127.0.0.1`, `::1`, or the IPv4-mapped
   `::ffff:127.0.0.1`. Read from `req.socket.remoteAddress` — the raw TCP peer,
   which cannot be spoofed by an `X-Forwarded-For` header (unlike `req.ip` under
   `trust proxy`). A non-loopback peer ⇒ `false`.
3. **Display check (platform).** A GUI session must plausibly exist:
   - `darwin` (macOS): assume a display (the common local-dev case; if truly
     headless, `osascript` fails fast and the resolver maps it to unavailable).
   - `linux`: require `DISPLAY` or `WAYLAND_DISPLAY` to be non-empty.
   - `win32` (Windows): assume a display.
   - any other platform ⇒ `false` (no picker command wired).

`canUseNativeDialog` is `SETTINGS_READ` metadata for the client to choose the
Browse affordance; it does **not** itself grant the pick. The actual
`pickFolderNative` mutation (`SETTINGS_WRITE`) re-evaluates the same predicate
and short-circuits to "unavailable" before spawning, so a stale client flag
can never cause a spawn on a remote/headless server.

## Decision 2 — per-OS folder-dialog commands

All spawned with `execFile` (argv array, **no shell string interpolation**) and
a bounded timeout (default 2 minutes) that kills the child on expiry so a
forgotten dialog cannot pin a request. `stdout` is trimmed to the absolute path;
a **non-zero exit with empty stdout is treated as user-cancel → `null`** (a
clean no-op, never an error toast).

| OS       | Command (argv)                                                                                          | Success stdout                     | User-cancel                                   |
| -------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------- |
| `darwin` | `osascript -e 'POSIX path of (choose folder with prompt "Select a workspace folder")'`                  | absolute POSIX path + trailing `/` | exit 1, stderr `User canceled.`, empty stdout |
| `linux`  | `zenity --file-selection --directory --title "Select a workspace folder"`                               | absolute path                      | exit 1, empty stdout                          |
| `linux`  | fallback `kdialog --getexistingdirectory "$HOME"` (when `zenity` is absent)                             | absolute path                      | exit 1, empty stdout                          |
| `win32`  | `powershell -NoProfile -STA -Command "<FolderBrowserDialog snippet>"` (writes `SelectedPath` to stdout) | absolute Windows path              | non-zero / empty stdout (Cancel)              |

Windows snippet (single `-Command` string):

```powershell
Add-Type -AssemblyName System.Windows.Forms;
$d = New-Object System.Windows.Forms.FolderBrowserDialog;
if ($d.ShowDialog() -eq 'OK') { [Console]::Out.Write($d.SelectedPath) }
```

Normalization before returning:

- Trim trailing whitespace/newline; on macOS strip the trailing `/`
  (except root `/`) so the path matches what `addWorkspaceFolder` expects.
- Empty (after trim) ⇒ `null` (cancel).
- Run the existing path-safety normalization (`realpathSync`, absolute + NUL
  checks) before returning. The returned path **may be outside** the configured
  workspace roots — that is intentional and mirrors today's manual-path escape
  hatch (also root-unrestricted); the native pick is an explicit user gesture.

## Timeout & cancel summary

- **Timeout:** `execFile` `timeout` option (2 min); child killed on expiry;
  surfaced to the client as a plain error (retryable), not a crash.
- **Cancel:** non-zero exit **with empty stdout** ⇒ `null` ⇒ the client simply
  reopens/leaves the dialog, no error surfaced.
- **Unavailable:** predicate `false` ⇒ resolver returns/throws "unavailable"
  **before** spawning any child.
