/**
 * @description The workspace the MCP server was launched in, captured ONCE at stdio startup so
 * `create_plan` can record which checkout a plan was written from.
 *
 * Why a captured module value rather than a `process.cwd()` read inside the tool handler: the tool
 * handlers are shared with the Nest/HTTP surface (`run-server-http.ts`, `nest/`), which runs INSIDE
 * the OpenThrottle server process. There `process.cwd()` is the server's own directory and has
 * nothing to do with any caller's workspace. Only {@link runServerLocal} captures, so the HTTP
 * surface reads `null` and sends no path at all.
 *
 * The captured value is a hint, never an authority: the server resolves it against the
 * authenticated caller's own registered checkouts and ignores anything it cannot own.
 */

let capturedWorkspacePath: string | null = null;

/**
 * @description The workspace to report on the stdio transport: `OPENTHROTTLE_MCP_WORKSPACE_PATH`
 * when set (for clients that launch the server from a fixed directory), else the process cwd.
 */
export const resolveStdioWorkspacePath = (): string => {
  const override = process.env.OPENTHROTTLE_MCP_WORKSPACE_PATH?.trim() ?? '';
  return override !== '' ? override : process.cwd();
};

/** @description Records the caller's workspace for this process. Pass null to clear it. */
export const captureCallerWorkspacePath = (path: string | null): void => {
  capturedWorkspacePath = path;
};

/** @description The captured workspace, or null when nothing captured (the HTTP surface). */
export const getCapturedWorkspacePath = (): string | null =>
  capturedWorkspacePath;

/**
 * @description The `workspacePath` to send with a plan create, or undefined to omit the field.
 * An explicitly-passed argument always wins over the captured cwd, and an explicit empty string or
 * null opts out entirely.
 */
export const resolveWorkspacePathArgument = (
  explicit: string | null | undefined,
): string | undefined => {
  if (explicit !== undefined) {
    const trimmed = explicit?.trim() ?? '';
    return trimmed === '' ? undefined : trimmed;
  }

  return getCapturedWorkspacePath() ?? undefined;
};
