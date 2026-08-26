/**
 * @description What counts as a leak.
 *
 * The failure mode this guards is silent and irreversible: once a frame with a token
 * or a real repository name is on YouTube, taking the video down does not un-see it.
 * So the rules are deliberately noisy — a false positive costs a glance, a false
 * negative costs a disclosure.
 */

/**
 * What is being scanned.
 *
 * `frame` is text that was ON SCREEN during the recording. `shipped` is text that
 * travels WITH the video — the caption sidecar and the upload metadata. The
 * distinction matters: the standard description block deliberately contains the
 * repository URL, so a denylist that fires on it is wrong, while the same string in a
 * frame means the recording ran against real data.
 */
export type ScanKind = 'frame' | 'shipped';

export interface LeakRule {
  /** Which source kinds this rule applies to. */
  readonly appliesTo: readonly ScanKind[];
  /** Why this matters, shown with the hit so the reader does not have to guess. */
  readonly because: string;
  readonly id: string;
  readonly pattern: RegExp;
  /** `error` fails the check; `warn` reports and keeps going. */
  readonly severity: 'error' | 'warn';
}

/**
 * Real identities and infrastructure that must never appear in a demo FRAME. Add to
 * this as the channel grows; it is cheaper than remembering.
 *
 * The demo fixture is entirely fictional, so any hit here means the recording ran
 * against the WRONG DATABASE — the single worst thing that can happen to this
 * pipeline. Checked against frames only: the description block is supposed to carry
 * the repository URL.
 */
export const DENYLIST: readonly string[] = [
  'OpenThrottle/monorepo',
  'openthrottle.ai',
  'shiftsmart',
  'visormatt',
];

/** Hosts a demo frame may legitimately show. */
export const ALLOWED_HOSTS: readonly string[] = [
  'atlasworks.example',
  'github.com/OpenThrottle',
  'localhost',
];

export const RULES: readonly LeakRule[] = [
  {
    appliesTo: ['frame', 'shipped'],
    because:
      'A real address in the account menu or an assignee field identifies a person.',
    id: 'email-address',
    pattern:
      /\b[A-Za-z0-9._%+-]+@(?!atlasworks\.example)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    severity: 'error',
  },
  {
    appliesTo: ['frame', 'shipped'],
    because:
      'A home directory leaks a username and the shape of someone’s machine.',
    id: 'home-path',
    pattern: /\/(?:Users|home)\/[a-z0-9._-]+/gi,
    severity: 'error',
  },
  {
    appliesTo: ['frame', 'shipped'],
    because:
      'Provider token prefixes are unambiguous: if one is on screen it is live.',
    id: 'token-prefix',
    pattern:
      /\b(?:sk-[A-Za-z0-9-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{12,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
    severity: 'error',
  },
  {
    appliesTo: ['frame', 'shipped'],
    because: 'A JWT in view is a live session someone can replay.',
    id: 'jwt',
    pattern:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    severity: 'error',
  },
  {
    appliesTo: ['frame'],
    because:
      'A long unbroken high-entropy string is usually a key, a token or a session id. Sometimes it is a hash or a uuid, which is why this warns rather than fails.',
    id: 'high-entropy',
    pattern: /\b(?![0-9a-f]{8}-)[A-Za-z0-9+/_-]{32,}={0,2}\b/g,
    severity: 'warn',
  },
  {
    appliesTo: ['frame'],
    because:
      'A private URL on screen tells viewers where your infrastructure lives, and a query string can carry a token.',
    id: 'external-url',
    pattern: /\bhttps?:\/\/[^\s"'<>)]+/g,
    severity: 'warn',
  },
];
