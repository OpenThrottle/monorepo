import * as React from 'react';
import { Link } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { TagsIcon } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import { SkillAvailabilityAuthoringVocabularyDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillTagVocabularyManager } from '~/routing/skills/components/SkillTagVocabularyManager';
import {
  SKILL_AVAILABILITY_COPY,
  SKILL_VOCABULARY_COPY,
} from '~/routing/skills/data/data.copy';
import type { SkillTagValue } from '~/routing/skills/utils/skill-availability';
import { runVocabularyAction } from '~/routing/skills/actions/vocabulary';
import type { Route } from '@/app/routes/+types/skills.vocabulary';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Vocabulary',
  links: (_match) => [{ children: 'Skills', to: '/skills' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { skillTagVocabulary } = await executeGraphqlWithAuth(
    args.request,
    SkillAvailabilityAuthoringVocabularyDocument,
  );

  const vocabulary: SkillTagValue[] = skillTagVocabulary.tags.map((tag) => ({
    id: tag.id,
    tag: tag.tag,
  }));

  return { vocabulary };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${SKILL_VOCABULARY_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { vocabulary } = props.loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <GlobalHeading
              className="mb-4"
              heading="h1"
              icon={TagsIcon}
              title={SKILL_VOCABULARY_COPY.pageTitle}
            />
            <p className="text-muted-foreground text-sm">
              {SKILL_VOCABULARY_COPY.pageDescription}{' '}
              {SKILL_AVAILABILITY_COPY.vocabulary.caveat}
            </p>
          </div>
          <Button asChild={true} variant="outline">
            <Link to="/skills">{SKILL_VOCABULARY_COPY.backLink}</Link>
          </Button>
        </div>

        <SkillTagVocabularyManager tags={vocabulary} />
      </div>
    </GlobalScreen>
  );
}

export const action = (args: Route.ActionArgs) => runVocabularyAction(args);

export const ErrorBoundary = GlobalErrorBoundary;
