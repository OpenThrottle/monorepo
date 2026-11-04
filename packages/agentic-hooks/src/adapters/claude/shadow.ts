/**
 * Plugin-vs-repo dedupe for Claude Code. Inside a repository whose own
 * `.claude/settings.json` registers the skill-usage hooks, the user-scoped
 * plugin registers the SAME hooks again, so each Skill call was captured
 * twice (96 twins, OT plan e7b74d81). When both are present the repository's
 * registration wins and the plugin copy stands down.
 *
 * The server refuses duplicates too (migration 134); this removes the second
 * POST at its source. Fail-open in the direction of capturing: any doubt —
 * unreadable or invalid settings, no plugin root — means "not shadowed".
 */
import fs from 'node:fs';
import path from 'node:path';

/** The bundle name both registrations point at. */
const CAPTURE_BUNDLE = 'skill-usage-capture';

/**
 * True when THIS process is the plugin's copy of a hook: Claude Code sets
 * `CLAUDE_PLUGIN_ROOT` for plugin hooks, and the running script lives under it.
 */
const runningFromPlugin = (
  env: NodeJS.ProcessEnv,
  scriptPath: string | undefined,
): boolean => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot || !scriptPath) {
    return false;
  }
  const relative = path.relative(path.resolve(pluginRoot), scriptPath);
  return relative !== '' && !relative.startsWith('..');
};

/** True when the repo's own settings register the capture hook. */
const repoRegistersCapture = (repoRoot: string): boolean => {
  try {
    const raw = fs.readFileSync(
      path.join(repoRoot, '.claude', 'settings.json'),
      'utf8',
    );
    // Claude Code drops a settings file it cannot parse, so an unparseable
    // one registers nothing and the plugin must keep capturing.
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('hooks' in parsed)) {
      return false;
    }
    return JSON.stringify(parsed.hooks).includes(CAPTURE_BUNDLE);
  } catch {
    return false;
  }
};

/**
 * Whether this hook invocation should stand down because the repository's
 * own registration of the same hook will handle it.
 *
 * @public
 */
export const isShadowedByRepoHooks = ({
  env = process.env,
  repoRoot,
  scriptPath = process.argv[1],
}: {
  env?: NodeJS.ProcessEnv;
  repoRoot: string;
  scriptPath?: string;
}): boolean =>
  runningFromPlugin(env, scriptPath) && repoRegistersCapture(repoRoot);
