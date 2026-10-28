/**
 * @description Pure parser for the "Clone repo" input. Accepts a GitHub
 * `owner/repo` shorthand plus every common GitHub URL form, and turns them
 * into the single canonical clone URL `https://github.com/<owner>/<repo>.git`.
 * Everything that is not GitHub passes through byte-for-byte (after trimming).
 *
 * Why normalize to HTTPS at all: on a deployed server (the agents image) git
 * authenticates to github.com through the `gh` credential helper that the
 * container entrypoint configures under $HOME from GITHUB_TOKEN. That helper
 * only fires for HTTPS remotes, and the box has no SSH key — an SSH remote
 * would fail with "Permission denied (publickey)" no matter what token is set.
 *
 * SSH → HTTPS policy (deliberately NOT unconditional):
 * - `owner/repo` shorthand names no transport, so it always resolves to HTTPS.
 *   This matches `gh repo clone`, whose default git protocol is https.
 * - An explicit SSH URL (`git@github.com:o/r.git`, `ssh://git@github.com/o/r`)
 *   is an explicit transport choice. A developer's laptop may only have SSH
 *   keys, so rewriting it by default would turn a working clone into an auth
 *   failure. It is therefore rewritten to HTTPS only when
 *   `OPENTHROTTLE_GIT_PREFER_HTTPS` is truthy; the agents image sets it.
 * - `http://` and `git://` GitHub URLs are always upgraded to HTTPS: GitHub no
 *   longer serves anonymous `git://`, and plain http only redirects.
 *
 * Credentials are never accepted in a URL: `https://user:token@host/…` would
 * be written verbatim into `.git/config`, so it is rejected with a message
 * pointing at GITHUB_TOKEN instead.
 */

/**
 * @description Env var: truthy rewrites explicit GitHub SSH URLs to HTTPS (see above).
 */
const GIT_PREFER_HTTPS_ENV = 'OPENTHROTTLE_GIT_PREFER_HTTPS';

/** Hostnames that mean github.com for HTTPS/HTTP URLs. */
const GITHUB_WEB_HOSTS: ReadonlySet<string> = new Set([
  'github.com',
  'www.github.com',
]);

/** Protocols a non-GitHub clone URL may use (mirrors what git itself clones). */
const PASS_THROUGH_PROTOCOLS: ReadonlySet<string> = new Set([
  'file:',
  'git:',
  'http:',
  'https:',
  'ssh:',
]);

/** GitHub owner: alphanumerics, `-` and `_` (EMU shortcodes), no leading `-`. */
const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;

/** GitHub repository name: alphanumerics, `.`, `-`, `_`. */
const GITHUB_REPO_PATTERN = /^[A-Za-z0-9._-]+$/;

/** `user@host:path` scp-like syntax (no `://`). */
const SCP_LIKE_PATTERN = /^[\w.-]+@([\w.-]+):(.+)$/;

const SHAPES_MESSAGE =
  'Use owner/repo, https://github.com/owner/repo(.git), git@github.com:owner/repo.git, or another git URL.';

/** Outcome of parsing a clone target: a clone URL, or a user-facing rejection. */
export type GitCloneUrlParseResult =
  | {
      readonly message: string;
      readonly ok: false;
    }
  | {
      /** The URL to hand to `git clone`; never contains credentials. */
      readonly cloneUrl: string;
      /** `owner`/`repo` when the input resolved to a GitHub repository. */
      readonly github: GitHubRepositoryRef | null;
      readonly ok: true;
    };

export interface GitHubRepositoryRef {
  readonly owner: string;
  readonly repo: string;
}

export interface GitCloneUrlOptions {
  /** Rewrite explicit GitHub SSH URLs to HTTPS (see the module comment). */
  readonly preferHttps: boolean;
}

/**
 * @description Whether `OPENTHROTTLE_GIT_PREFER_HTTPS` asks for SSH → HTTPS
 * rewriting. Unset / blank / anything but a truthy word is off.
 */
export const isGitPreferHttpsEnabled = (
  env: NodeJS.ProcessEnv = process.env,
): boolean => {
  const raw = env[GIT_PREFER_HTTPS_ENV];
  return (
    raw !== undefined &&
    ['1', 'on', 'true', 'yes'].includes(raw.trim().toLowerCase())
  );
};

/** Canonical HTTPS clone URL for a GitHub repository. */
const githubHttpsUrl = (ref: GitHubRepositoryRef): string =>
  `https://github.com/${ref.owner}/${ref.repo}.git`;

const rejected = (message: string): GitCloneUrlParseResult => ({
  message,
  ok: false,
});

const accepted = (
  cloneUrl: string,
  github: GitHubRepositoryRef | null,
): GitCloneUrlParseResult => ({ cloneUrl, github, ok: true });

/**
 * @description Validate a `owner/repo` style path (leading slash, trailing
 * slash and one `.git` suffix tolerated). Rejects extra segments, `.`/`..`
 * segments and characters GitHub does not allow, so the result is safe to
 * interpolate into a URL.
 */
const parseGitHubPath = (path: string): GitHubRepositoryRef | null => {
  const trimmed = path
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');
  const segments = trimmed.split('/');
  const [owner, repo] = segments;
  if (segments.length !== 2 || owner === undefined || repo === undefined) {
    return null;
  }
  if (!GITHUB_OWNER_PATTERN.test(owner) || !GITHUB_REPO_PATTERN.test(repo)) {
    return null;
  }
  if (owner.includes('..') || repo.includes('..') || repo === '.') return null;
  return { owner, repo };
};

const malformedGitHub = (shown: string): GitCloneUrlParseResult =>
  rejected(
    `"${shown}" is not a valid GitHub repository. Use owner/repo — letters, numbers, ".", "-" and "_" only, with no extra path segments.`,
  );

/** Resolve a GitHub path to an accepted canonical HTTPS result. */
const githubResult = (path: string, shown: string): GitCloneUrlParseResult => {
  const ref = parseGitHubPath(path);
  return ref === null
    ? malformedGitHub(shown)
    : accepted(githubHttpsUrl(ref), ref);
};

/** GitHub resolved from an explicit SSH URL: HTTPS only when preferred. */
const githubSshResult = (
  path: string,
  raw: string,
  options: GitCloneUrlOptions,
): GitCloneUrlParseResult => {
  const ref = parseGitHubPath(path);
  if (ref === null) return malformedGitHub(raw);
  return accepted(options.preferHttps ? githubHttpsUrl(ref) : raw, ref);
};

const credentialsMessage =
  "Do not put credentials in the git URL — they would be stored in the checkout's .git/config. The server authenticates with its own GITHUB_TOKEN / gh credential helper.";

/** `user@host:path` and `host:path` forms. */
const parseScpLike = (
  raw: string,
  options: GitCloneUrlOptions,
): GitCloneUrlParseResult | null => {
  if (raw.includes('://')) return null;
  const match = SCP_LIKE_PATTERN.exec(raw);
  const host = match?.[1];
  const path = match?.[2];
  if (host === undefined || path === undefined) return null;
  return host.toLowerCase() === 'github.com'
    ? githubSshResult(path, raw, options)
    : accepted(raw, null);
};

const parseUrl = (
  raw: string,
  options: GitCloneUrlOptions,
): GitCloneUrlParseResult => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return rejected(`"${raw}" is not a git URL. ${SHAPES_MESSAGE}`);
  }
  if (!PASS_THROUGH_PROTOCOLS.has(url.protocol)) {
    return rejected(
      `"${url.protocol}" URLs cannot be cloned. ${SHAPES_MESSAGE}`,
    );
  }

  const host = url.hostname.toLowerCase();

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    if (url.username !== '' || url.password !== '') {
      return rejected(credentialsMessage);
    }
    if (!GITHUB_WEB_HOSTS.has(host)) return accepted(raw, null);
    if (url.search !== '' || url.hash !== '') return malformedGitHub(raw);
    return githubResult(url.pathname, raw);
  }

  if (url.protocol === 'ssh:' && url.password !== '') {
    return rejected(credentialsMessage);
  }

  const isGitHubHost = host === 'github.com';
  if (
    url.protocol === 'ssh:' &&
    isGitHubHost &&
    ['', '22'].includes(url.port)
  ) {
    return githubSshResult(url.pathname, raw, options);
  }
  if (url.protocol === 'git:' && isGitHubHost) {
    return githubResult(url.pathname, raw);
  }

  return accepted(raw, null);
};

/**
 * @description Parse a user-supplied clone target into the URL to clone.
 * Never throws; the caller turns a rejection into a classified error.
 */
export const parseGitCloneUrl = (
  input: string,
  options: GitCloneUrlOptions,
): GitCloneUrlParseResult => {
  const raw = input.trim();
  if (raw === '') return rejected(`Enter a repository. ${SHAPES_MESSAGE}`);
  if (/\s/.test(raw)) {
    return rejected(`"${raw}" is not a git URL. ${SHAPES_MESSAGE}`);
  }

  // No scheme, no `@`, no `:` → `owner/repo` (or `github.com/owner/repo`).
  if (!raw.includes(':') && !raw.includes('@')) {
    const bare = raw.replace(/^(?:www\.)?github\.com\//i, '');
    return githubResult(bare, raw);
  }

  return parseScpLike(raw, options) ?? parseUrl(raw, options);
};
