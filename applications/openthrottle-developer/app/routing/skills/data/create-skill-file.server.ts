/**
 * @description Server-only create side of the skills feature: writes a brand-new
 * SKILL.md to one of three destinations and then links it into the agent skills
 * layout so it is actually discoverable.
 *
 * The sibling `write-skill-file.server.ts` derives its target from an
 * ALREADY-DISCOVERED entry. Create has no such entry — the skill does not exist
 * yet — so the target is derived from the slug plus the destination and nothing
 * else, and every root and containment check is done here rather than inherited
 * from discovery:
 *
 * - `openthrottle` → `<monorepoRoot>/skills/<slug>/SKILL.md`
 * - `custom`   → `<monorepoRoot>/.agents/skills/<slug>/SKILL.md`, written as a
 *   REAL directory rather than a symlink. It is committable by construction:
 *   the managed `.gitignore` block ignores everything under `.agents/skills`
 *   but re-includes nested directories, and git classes the generated symlinks
 *   as files — so the real directory survives while the links stay ignored.
 * - `personal` → `<personalRoot>/<slug>/SKILL.md`, where `personalRoot` comes
 *   from `resolvePersonalSkillsRoot` — the same `OPENTHROTTLE_PERSONAL_SKILLS_DIR`
 *   → `~/.openthrottle/skills` precedence `ot-skill-sync`'s `common.sh` uses, so
 *   the module and sync agree on the root by construction rather than by luck.
 *
 * Nothing touches disk until every refusal below has passed, so a rejected
 * create leaves the filesystem byte-identical — including no empty directory.
 *
 * The collision rules mirror `personal.sh`'s `assert_name_is_free` exactly,
 * because a name that collides across the committed catalog, the lockfile and
 * the personal root is a hard error in `sync.sh`. Allowing the write and letting
 * sync fail afterwards would leave a file on disk that breaks the next sync for
 * everything else too.
 *
 * Writing is only half of it: `discoverRepoSkills` scans the agent layout dirs
 * and never `skills/` nor the personal root, so the file is invisible on
 * `/skills` until `syncSkillLinks` runs. A custom create is the exception — it
 * writes straight into `.agents/skills/`, the SSOT view, so it is discoverable
 * at once — but the per-CLI fan-out dirs (`.claude/skills`, `.codex/skills`, …)
 * still need the links, so sync runs for every destination alike. A sync failure
 * is surfaced as its own error and never as success — see
 * `sync-skill-links.server.ts`.
 *
 * Content is normalized to LF before anything else touches it: form encoding
 * turns every newline into CRLF on the wire, and a CRLF SKILL.md in a repo of
 * LF files is a diff nobody asked for.
 *
 * Re-ingest is deliberately NOT triggered here, matching the edit path:
 * `projectSkills` refreshes on the next agent-asset ingest run, while disk
 * discovery reflects the new skill immediately.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { resolvePersonalSkillsRoot } from '@openthrottle/openthrottle-agentic-utils';
import {
  AGENT_ASSET_SLUG_PATTERN,
  SKILLS_LOCK_FILENAME,
  parseSkillsLockFile,
  validateAgentAssetFrontmatter,
} from '@openthrottle/openthrottle-skills';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import { getMonorepoRoot } from '~/routing/agents/data/resolve-monorepo-root.server';
import { isPathInsideRoot } from '~/routing/agents/data/skill-path-allowlist.server';
import type { SkillCreateDestination } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import { syncSkillLinks } from '~/routing/skills/data/sync-skill-links.server';

/** OpenThrottle's committed catalog, relative to the monorepo root. */
const SKILLS_SRC_DIR = 'skills';

/**
 * The canonical SSOT skills view, relative to the monorepo root. A custom skill
 * is written here as a real directory — the same shape a lockfile install has,
 * distinguished from one only by the lockfile not claiming its slug.
 */
const AGENTS_SKILLS_DIR = '.agents/skills';

const SKILL_FILENAME = 'SKILL.md';

export interface CreateSkillFileInput {
  readonly content: string;
  readonly destination: SkillCreateDestination;
  readonly slug: string;
}

export type CreateSkillFileResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly slug: string };

const withSlug = (template: string, slug: string): string =>
  template.replaceAll('{slug}', slug);

/**
 * Rejects anything that is not a bare kebab-case slug. The pattern already
 * excludes `/`, `\` and `.`, so a traversal segment can never survive it — the
 * explicit separator check below is belt-and-braces against the pattern ever
 * being loosened, not a second line of real defence.
 */
const isSafeSlug = (slug: string): boolean =>
  AGENT_ASSET_SLUG_PATTERN.test(slug) &&
  !slug.includes('/') &&
  !slug.includes('\\') &&
  !slug.includes('..');

/**
 * True when `candidate` is the monorepo root or lies beneath it, resolved
 * against the nearest ANCESTOR THAT EXISTS.
 *
 * A plain realpath check is not enough here: the personal root frequently does
 * not exist yet on a first create, and realpath on a missing path fails, which
 * would read as "not inside the repo" — exactly the wrong answer for the case
 * this guard exists to catch. Walking up to the first real directory resolves
 * any symlinked ancestor while still answering for a path that has yet to be
 * created.
 */
const resolvesInsideMonorepo = (
  monorepoRoot: string,
  candidate: string,
): boolean => {
  let current = candidate;

  for (;;) {
    if (existsSync(current)) {
      // Equality matters as much as containment: a personal root pointed AT the
      // repo root is just as committable as one inside it, and `isPathInsideRoot`
      // is strict (`root/` prefix), so it answers false for that case.
      try {
        return (
          realpathSync(current) === realpathSync(monorepoRoot) ||
          isPathInsideRoot(monorepoRoot, current)
        );
      } catch {
        return false;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      return false;
    }
    current = parent;
  }
};

/** Slugs installed by `npx skills`, read from the repo-root lockfile. */
const lockfileSkillSlugs = (monorepoRoot: string): readonly string[] => {
  try {
    return Object.keys(
      parseSkillsLockFile(
        readFileSync(join(monorepoRoot, SKILLS_LOCK_FILENAME), 'utf8'),
      ),
    );
  } catch {
    // No lockfile is the common case in a repo that installs nothing.
    return [];
  }
};

/**
 * The absolute root each destination writes beneath. Derived from the
 * destination alone — client input contributes only the slug.
 */
const destinationRoot = (
  destination: SkillCreateDestination,
  monorepoRoot: string,
  personalRoot: string,
): string => {
  switch (destination) {
    case SKILL_CREATE_DESTINATIONS.custom:
      return join(monorepoRoot, AGENTS_SKILLS_DIR);
    case SKILL_CREATE_DESTINATIONS.openthrottle:
      return join(monorepoRoot, SKILLS_SRC_DIR);
    case SKILL_CREATE_DESTINATIONS.personal:
      return personalRoot;
    default: {
      const exhaustive: never = destination;
      throw new Error(`Unhandled create destination: ${String(exhaustive)}`);
    }
  }
};

/**
 * The path reported to frontmatter validation. Repo-rooted for the two in-repo
 * destinations; slug-relative for personal, whose root is outside the checkout.
 */
const validationPath = (
  destination: SkillCreateDestination,
  slug: string,
): string => {
  switch (destination) {
    case SKILL_CREATE_DESTINATIONS.custom:
      return `${AGENTS_SKILLS_DIR}/${slug}/${SKILL_FILENAME}`;
    case SKILL_CREATE_DESTINATIONS.openthrottle:
      return `${SKILLS_SRC_DIR}/${slug}/${SKILL_FILENAME}`;
    case SKILL_CREATE_DESTINATIONS.personal:
      return `${slug}/${SKILL_FILENAME}`;
    default: {
      const exhaustive: never = destination;
      throw new Error(`Unhandled create destination: ${String(exhaustive)}`);
    }
  }
};

/**
 * @description Validates and creates a new SKILL.md, then links it in.
 *
 * Every refusal (no monorepo root, unsafe slug, unknown destination, a personal
 * root inside the repo, a path escaping its root, a name already taken in the
 * committed catalog / lockfile / personal root / disk discovery, frontmatter
 * that does not validate) returns a structured error WITHOUT writing anything.
 */
export const createSkillFile = (
  input: CreateSkillFileInput,
): CreateSkillFileResult => {
  const { destination, slug } = input;

  // Form encoding normalizes line endings to CRLF on the wire, so content
  // authored in the browser arrives with \r\n regardless of what was typed.
  // Writing that straight to disk would put the only CRLF file in a repo of LF
  // ones. Normalized here, at the boundary, so everything downstream — the
  // validator, the byte-for-byte write, the eventual diff — sees LF.
  const content = input.content.replaceAll('\r\n', '\n');

  const monorepoRoot = getMonorepoRoot();
  if (!monorepoRoot) {
    return { error: SKILL_CREATE_COPY.noRootError, ok: false };
  }

  if (!isSafeSlug(slug)) {
    return { error: SKILL_CREATE_COPY.invalidSlugError, ok: false };
  }

  if (content.trim().length === 0) {
    return { error: SKILL_CREATE_COPY.missingContentError, ok: false };
  }

  const personalRoot = resolvePersonalSkillsRoot();

  // sync.sh only makes this check when the root already exists. Create is the
  // operation that would BRING it into existence in a committable location, so
  // it refuses unconditionally — for both destinations, since a repo-destined
  // create still triggers a sync that would then abort on the same rule.
  if (resolvesInsideMonorepo(monorepoRoot, personalRoot)) {
    return { error: SKILL_CREATE_COPY.personalRootInsideRepoError, ok: false };
  }

  // The expected root the target must resolve inside, per destination. Derived
  // from the destination alone — client input contributes only the slug.
  const expectedRoot = destinationRoot(destination, monorepoRoot, personalRoot);

  const skillDirectory = join(expectedRoot, slug);
  const absolutePath = join(skillDirectory, SKILL_FILENAME);

  // ── Collisions: the same three sync treats as hard errors ──────────────────
  if (existsSync(join(monorepoRoot, SKILLS_SRC_DIR, slug, SKILL_FILENAME))) {
    return {
      error: withSlug(SKILL_CREATE_COPY.repoCollisionError, slug),
      ok: false,
    };
  }

  if (lockfileSkillSlugs(monorepoRoot).includes(slug)) {
    return {
      error: withSlug(SKILL_CREATE_COPY.lockfileCollisionError, slug),
      ok: false,
    };
  }

  if (existsSync(join(personalRoot, slug))) {
    return {
      error: withSlug(SKILL_CREATE_COPY.personalCollisionError, slug),
      ok: false,
    };
  }

  // A slug already linked into a layout dir is taken even when none of the
  // three source roots above holds it — a lockfile-installed real directory
  // with no lockfile entry, say. Creating it anyway makes two skills answer to
  // one name.
  if (discoverRepoSkills(monorepoRoot).some((entry) => entry.slug === slug)) {
    return {
      error: withSlug(SKILL_CREATE_COPY.slugTakenError, slug),
      ok: false,
    };
  }

  // Discovery only sees a folder that HOLDS a SKILL.md, so a bare
  // `.agents/skills/<slug>/` directory slips past the check above — and a custom
  // create targets that directory directly, where the other two destinations
  // never do. Refuse it explicitly rather than quietly filling someone else's
  // directory (or throwing EEXIST out of the write).
  if (
    destination === SKILL_CREATE_DESTINATIONS.custom &&
    existsSync(skillDirectory)
  ) {
    return {
      error: withSlug(SKILL_CREATE_COPY.slugTakenAgentsDirError, slug),
      ok: false,
    };
  }

  const { errors } = validateAgentAssetFrontmatter({
    content,
    expectedSlug: slug,
    kind: 'skill',
    path: validationPath(destination, slug),
  });

  if (errors.length > 0) {
    const detail = errors
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join('; ');
    return {
      error: `${SKILL_CREATE_COPY.invalidFrontmatterError} ${detail}`,
      ok: false,
    };
  }

  try {
    mkdirSync(skillDirectory, { recursive: true });
  } catch {
    return { error: SKILL_CREATE_COPY.writeFailedError, ok: false };
  }

  // Containment is re-checked AFTER mkdir because realpath needs the path to
  // exist to resolve it — and it checks the DIRECTORY, not the file, which has
  // not been written yet. This is the check that catches a symlinked root
  // pointing somewhere else entirely; the string-level slug guard above cannot.
  if (!isPathInsideRoot(expectedRoot, skillDirectory)) {
    return { error: SKILL_CREATE_COPY.pathEscapeError, ok: false };
  }

  try {
    writeFileSync(absolutePath, content, 'utf8');
  } catch {
    return { error: SKILL_CREATE_COPY.writeFailedError, ok: false };
  }

  const syncResult = syncSkillLinks(monorepoRoot);
  if (!syncResult.ok) {
    return { error: syncResult.error, ok: false };
  }

  return { ok: true, slug };
};
