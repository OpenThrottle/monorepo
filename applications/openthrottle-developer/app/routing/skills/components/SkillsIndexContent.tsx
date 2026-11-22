import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { GlobalFeatureOnboarding } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { RepoSkillEntry } from '~/routing/agents/data/data.repo-skills-registry';
import { SKILL_RECORD_TAG_INTENTS } from '~/routing/skills/actions/project-skill-tags';
import { SkillsTable } from '~/routing/skills/components/SkillsTable';
import { SkillsToolbar } from '~/routing/skills/components/SkillsToolbar';
import type { SkillTagVocabularyOption } from '~/routing/skills/components/SkillTagChips';
import { SKILLS_ONBOARDING } from '~/routing/skills/data/data.copy';
import { useSkillsIndex } from '~/routing/skills/hooks/useSkillsIndex';

export interface SkillsIndexContentProps {
  readonly entries: readonly RepoSkillEntry[];
  readonly tagVocabulary: readonly SkillTagVocabularyOption[];
}

export const SkillsIndexContent = (
  props: SkillsIndexContentProps,
): React.ReactElement => {
  const { entries, tagVocabulary } = props;

  // Hooks
  const index = useSkillsIndex({ entries });

  // Setup

  // Handlers

  // Markup
  const onboarding = <GlobalFeatureOnboarding content={SKILLS_ONBOARDING} />;
  const skillsListing = (
    <>
      <div className="flex flex-col gap-4">
        <SkillsToolbar
          onSourceFilterChange={index.handleSourceFilterChange}
          sourceFilter={index.sourceFilter}
        />
        <SkillsTable
          entries={index.pageEntries}
          isFiltered={index.isFiltered}
          onAddTag={(slug, tag) =>
            index.submitTagIntent(SKILL_RECORD_TAG_INTENTS.ADD_TAG, slug, tag)
          }
          onRemoveOrphan={(slug) =>
            index.submitTagIntent(SKILL_RECORD_TAG_INTENTS.REMOVE_ORPHAN, slug)
          }
          onRemoveTag={(slug, tag) =>
            index.submitTagIntent(
              SKILL_RECORD_TAG_INTENTS.REMOVE_TAG,
              slug,
              tag,
            )
          }
          pendingSlug={index.pendingSlug}
          vocabulary={tagVocabulary}
        />
      </div>

      <OpenThrottlePagination
        basePath="/skills"
        className="mt-8"
        limit={index.limit}
        page={index.page}
        // The skills list filters client-side on `?search=` and
        // `?source=`, neither of which the extras contract models — clone
        // the live query string so a page change keeps the filtered set.
        preserveSearchParams={true}
        resultLabel="skills"
        total={index.totalCount}
      />
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return <>{index.isNewUser ? onboarding : skillsListing}</>;
};
