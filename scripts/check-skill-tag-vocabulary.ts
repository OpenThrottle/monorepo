/**
 * @description CI-only entrypoint: enum-validate every `.agents/skills/<slug>/SKILL.md`
 * `tags` field against `DEFAULT_SKILL_TAG_VOCABULARY` (this monorepo's own corpus
 * only — see docs/monorepo/skill-availability-design.md, "Tags" section).
 * Invoked from scripts/check-agent-assets-ssot.sh. Deliberately separate from
 * `skillFrontmatterSchema`, which stays permissive for ingest of external
 * workspace repos.
 */

import {
  DEFAULT_SKILL_TAG_VOCABULARY,
  findUnknownSkillTags,
  parseSkillFrontmatter,
  walkAgentAssetFiles,
} from '@openthrottle/openthrottle-skills';
import type { SkillTagVocabularyEntry } from '@openthrottle/openthrottle-skills';

const run = (): void => {
  const monorepoRoot = process.cwd();
  const { files } = walkAgentAssetFiles({ monorepoRoot });

  const entries: SkillTagVocabularyEntry[] = files
    .filter((file) => file.kind === 'skill')
    .map((file) => ({
      path: file.path,
      tags: parseSkillFrontmatter(file.content).tags,
    }));

  const violations = findUnknownSkillTags(
    entries,
    DEFAULT_SKILL_TAG_VOCABULARY,
  );

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `check-skill-tag-vocabulary: ${violation.path}: unknown tag "${violation.tag}" (not in DEFAULT_SKILL_TAG_VOCABULARY)`,
      );
    }
    console.error(
      `check-skill-tag-vocabulary: ${violations.length} violation(s); use a tag from DEFAULT_SKILL_TAG_VOCABULARY in packages/openthrottle-skills/src/default-skill-tag-vocabulary.ts`,
    );
    process.exit(1);
  }

  console.log(
    `check-skill-tag-vocabulary: OK (${entries.length} skill(s) checked)`,
  );
};

run();
