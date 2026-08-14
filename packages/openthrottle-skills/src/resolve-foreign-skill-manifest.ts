import { discoverSkillDirs } from './discover-skill-dirs.ts';

/**
 * Source layer a resolved skill came from. The target repo is never a layer in
 * the manifest — its skills are the exclusion set, not injected content — so
 * only the two injected layers appear here.
 *
 * @public
 */
export const FOREIGN_SKILL_LAYER = {
  otCurated: 'ot-curated',
  personal: 'personal',
} as const;

/** @public */
export type ForeignSkillLayer =
  (typeof FOREIGN_SKILL_LAYER)[keyof typeof FOREIGN_SKILL_LAYER];

/**
 * One entry in the resolved manifest: a skill that should be projected into the
 * foreign repo, tagged with the layer that won its name.
 *
 * @public
 */
export interface ForeignSkillManifestEntry {
  readonly layer: ForeignSkillLayer;
  readonly name: string;
  readonly sourcePath: string;
}

/**
 * @public
 */
export interface ResolveForeignSkillManifestInput {
  /**
   * Absolute path to the OpenThrottle curated SSOT skills root
   * (`<OT_ROOT>/skills`). Discovered as the base layer.
   */
  readonly otCuratedSkillsDir: string;
  /**
   * Absolute path to the opt-in per-user experimental skills root. `undefined`
   * (feature off) is a clean no-op — the manifest is OT-curated only.
   */
  readonly personalSkillsDir?: string | undefined;
  /**
   * Skill names the target repo already defines (basenames present under its
   * own `.agents/skills` / `.claude/skills`). These are excluded from the
   * manifest so the target repo always wins on a name collision.
   */
  readonly targetRepoSkillNames?: Iterable<string> | undefined;
}

/**
 * @public
 */
export interface ResolveForeignSkillManifestResult {
  readonly entries: readonly ForeignSkillManifestEntry[];
  readonly warnings: readonly string[];
}

/**
 * @description Resolves the ordered, de-duplicated skill manifest to project
 * into a foreign repo, applying the locked three-layer precedence: OT curated
 * (`skills/`) < personal/experimental (per-user dir) < target repo.
 *
 * - **Personal overrides OT curated** on a name collision between the two
 *   injected layers.
 * - **The target repo wins outright**: any name in `targetRepoSkillNames` is
 *   dropped from the manifest entirely (never masked), so target-wins is
 *   enforced here at resolve time rather than by racing a link on disk.
 * - **Personal dir absent/unset is a clean no-op** — OT curated only.
 *
 * Discovery reads the two source roots (via {@link discoverSkillDirs}) but this
 * performs **no filesystem mutation**; it only computes what should be linked.
 * Entries are sorted by name for a deterministic manifest.
 *
 * @public
 */
export const resolveForeignSkillManifest = (
  input: ResolveForeignSkillManifestInput,
): ResolveForeignSkillManifestResult => {
  const { otCuratedSkillsDir, personalSkillsDir, targetRepoSkillNames } = input;

  const warnings: string[] = [];

  const otCurated = discoverSkillDirs(otCuratedSkillsDir);
  warnings.push(...otCurated.warnings);

  const byName = new Map<string, ForeignSkillManifestEntry>();
  for (const skill of otCurated.skills) {
    byName.set(skill.name, {
      layer: FOREIGN_SKILL_LAYER.otCurated,
      name: skill.name,
      sourcePath: skill.path,
    });
  }

  // Personal layer overrides OT curated on collision. Absent dir → no-op.
  if (personalSkillsDir !== undefined && personalSkillsDir !== '') {
    const personal = discoverSkillDirs(personalSkillsDir);
    warnings.push(...personal.warnings);
    for (const skill of personal.skills) {
      byName.set(skill.name, {
        layer: FOREIGN_SKILL_LAYER.personal,
        name: skill.name,
        sourcePath: skill.path,
      });
    }
  }

  // Target repo wins: drop any name the target already owns.
  const excluded = new Set(targetRepoSkillNames ?? []);
  for (const name of excluded) {
    byName.delete(name);
  }

  const entries = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { entries, warnings };
};
