/**
 * @description CI-only entrypoint: validate this monorepo's own skill tags
 * (`.agents/skills/<slug>`) against the committed default vocabulary AND enforce
 * complete overlay coverage. Tags are attached via the repo-root
 * `skill-tag-overlays.json` (SKILL.md frontmatter carries no tags here); a skill's
 * effective tags are its frontmatter tags merged with its overlay tags. Invoked
 * from scripts/check-agent-assets-ssot.sh. Offline — no DB. Deliberately separate
 * from `skillFrontmatterSchema`, which stays permissive for ingest of external
 * workspace repos. See docs/monorepo/skill-availability-design.md, "Tags" section.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_SKILL_TAG_VOCABULARY,
  findUnknownSkillTags,
  mergeSkillTags,
  parseSkillFrontmatter,
  parseSkillTagOverlayFile,
  SKILL_TAG_OVERLAYS_FILENAME,
  walkAgentAssetFiles,
} from '@openthrottle/openthrottle-skills';
import type { SkillTagVocabularyEntry } from '@openthrottle/openthrottle-skills';

const run = (): void => {
  const monorepoRoot = process.cwd();
  const { files } = walkAgentAssetFiles({ monorepoRoot });

  const overlayFile = parseSkillTagOverlayFile(
    readFileSync(join(monorepoRoot, SKILL_TAG_OVERLAYS_FILENAME), 'utf8'),
  );
  const overlaySlugs = new Set(Object.keys(overlayFile.overlays));

  const skills = files.filter((file) => file.kind === 'skill');
  const seenSlugs = new Set<string>();
  const missingOverlay: string[] = [];

  const entries: SkillTagVocabularyEntry[] = skills.map((file) => {
    const slug = file.slug;
    if (slug !== undefined) {
      seenSlugs.add(slug);
      if (!overlaySlugs.has(slug)) {
        missingOverlay.push(slug);
      }
    }

    return {
      path: file.path,
      tags: mergeSkillTags(
        parseSkillFrontmatter(file.content).tags,
        slug === undefined ? undefined : overlayFile.overlays[slug]?.tags,
      ),
    };
  });

  const staleOverlay = [...overlaySlugs].filter((slug) => !seenSlugs.has(slug));
  const unknownTags = findUnknownSkillTags(
    entries,
    DEFAULT_SKILL_TAG_VOCABULARY,
  );

  let failed = false;

  for (const slug of missingOverlay) {
    console.error(
      `check-skill-tag-vocabulary: ${slug}: no entry in ${SKILL_TAG_OVERLAYS_FILENAME} (every skill must appear — zero tags is fine, add "${slug}": { "tags": [] })`,
    );
    failed = true;
  }

  for (const slug of staleOverlay) {
    console.error(
      `check-skill-tag-vocabulary: ${SKILL_TAG_OVERLAYS_FILENAME} has "${slug}" but no such skill exists under .agents/skills/ (remove the stale entry)`,
    );
    failed = true;
  }

  for (const violation of unknownTags) {
    console.error(
      `check-skill-tag-vocabulary: ${violation.path}: unknown tag "${violation.tag}" (not in DEFAULT_SKILL_TAG_VOCABULARY)`,
    );
    failed = true;
  }

  if (failed) {
    console.error(
      `check-skill-tag-vocabulary: FAILED — ${missingOverlay.length} uncovered skill(s), ${staleOverlay.length} stale overlay entr(y/ies), ${unknownTags.length} unknown tag(s). Edit ${SKILL_TAG_OVERLAYS_FILENAME}; use tags from DEFAULT_SKILL_TAG_VOCABULARY in packages/openthrottle-skills/src/default-skill-tag-vocabulary.ts`,
    );
    process.exit(1);
  }

  console.log(
    `check-skill-tag-vocabulary: OK (${entries.length} skill(s) checked; ${overlaySlugs.size} overlay entr(y/ies))`,
  );
};

run();
