/**
 * Env var pointing headless chat spawns at a dedicated claude config directory
 * (`CLAUDE_CONFIG_DIR`) that loads NO user plugins. Every headless `--print`
 * turn otherwise re-runs the host user's plugin SessionStart hooks (verified:
 * warp + vercel) and injects their CLAUDE.md before the model answers — pure
 * per-turn overhead on the critical path, and one source of the null-mapped
 * `system/hook_*` events behind the idle-backstop symptom.
 *
 * Opt-in and unset by default so subscription auth (OAuth creds under the real
 * config dir) keeps working out of the box. To isolate, point this at a stable,
 * server-owned directory that carries its own login (`CLAUDE_CONFIG_DIR=<dir>
 * claude auth login` — never a copied `.credentials.json`, which misses the
 * macOS Keychain) but has no `plugins/`/`settings.json` hooks. It must be
 * STABLE across turns: turn one writes the session transcript there under
 * `--session-id`, and `--resume` reads it back from the same place.
 */
export const CLAUDE_CONFIG_DIR_ENV = 'OPENTHROTTLE_CLAUDE_CONFIG_DIR';

/** The env key claude itself reads to relocate its config/plugins directory. */
export const CLAUDE_CONFIG_DIR_KEY = 'CLAUDE_CONFIG_DIR';

/**
 * Non-secret host env every claude child inherits: login identity + locale.
 * `USER` is load-bearing on macOS — without it the CLI cannot find the
 * subscription login in the Keychain and reports `loggedIn: false` (verified
 * 2.1.270). Shared by the chat spawn and discovery's auth probe so the probe
 * sees exactly the login a chat turn would.
 */
export const CLAUDE_HOST_ENV_KEYS = [
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'TERM',
  'TMPDIR',
  'USER',
] as const;

/**
 * The dedicated plugin-free config dir for headless chat, or undefined to leave
 * claude on its default (`~/.claude` via HOME). The OT override wins over any
 * inherited `CLAUDE_CONFIG_DIR` so chat turns can isolate independently of the
 * server's own claude config.
 */
export function resolveClaudeConfigDirOverride(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const override = env[CLAUDE_CONFIG_DIR_ENV]?.trim();
  return override !== undefined && override !== '' ? override : undefined;
}

/**
 * The config dir a chat spawn would actually run against, in the SAME
 * precedence the chat backend applies: `OPENTHROTTLE_CLAUDE_CONFIG_DIR`, else
 * the inherited `CLAUDE_CONFIG_DIR`, else undefined (claude's default under
 * HOME). Discovery's auth probe uses this so it reports the account chat uses.
 */
export function resolveEffectiveClaudeConfigDir(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const override = resolveClaudeConfigDirOverride(env);
  if (override !== undefined) {
    return override;
  }
  const inherited = env[CLAUDE_CONFIG_DIR_KEY]?.trim();
  return inherited !== undefined && inherited !== '' ? inherited : undefined;
}
