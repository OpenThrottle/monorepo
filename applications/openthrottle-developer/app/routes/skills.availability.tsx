import * as React from 'react';
import { Link } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  SkillAvailabilityAuthoringRuleSetDocument,
  SkillAvailabilityAuthoringVocabularyDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillAvailabilityPostureCard } from '~/routing/skills/components/SkillAvailabilityPostureCard';
import { SkillAvailabilityRulesEditor } from '~/routing/skills/components/SkillAvailabilityRulesEditor';
import { SkillTagVocabularyManager } from '~/routing/skills/components/SkillTagVocabularyManager';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import {
  isSkillAvailabilityPosture,
  type SkillAvailabilityPosture,
  type SkillAvailabilityRuleValue,
  type SkillTagValue,
} from '~/routing/skills/utils/skill-availability';
import { toEnvironmentValue } from '~/routing/skills/utils/skill-availability-action';
import { DOGFOOD_NX_PROJECT_NAME } from '~/routing/skills/config/availability';
import {
  resolveDogfoodProject,
  runAvailabilityAction,
} from '~/routing/skills/actions/availability';
import type { Route } from '@/app/routes/+types/skills.availability';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Availability',
  links: (_match) => [{ children: 'Skills', to: '/skills' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const project = await resolveDogfoodProject(args.request);

  if (project == null) {
    return {
      posture: null,
      projectId: null,
      projectName: null,
      rules: [],
      vocabulary: [],
    };
  }

  const [{ skillAvailabilityRuleSet }, { skillTagVocabulary }] =
    await Promise.all([
      executeGraphqlWithAuth(
        args.request,
        SkillAvailabilityAuthoringRuleSetDocument,
        { projectId: project.id },
      ),
      executeGraphqlWithAuth(
        args.request,
        SkillAvailabilityAuthoringVocabularyDocument,
      ),
    ]);

  const posture: SkillAvailabilityPosture | null =
    skillAvailabilityRuleSet != null &&
    isSkillAvailabilityPosture(skillAvailabilityRuleSet.posture)
      ? skillAvailabilityRuleSet.posture
      : null;

  const rules: SkillAvailabilityRuleValue[] = (
    skillAvailabilityRuleSet?.rules ?? []
  ).map((rule) => ({
    environment: toEnvironmentValue(rule.environment ?? null),
    id: rule.id,
    slugAllow: rule.slugAllow,
    slugDeny: rule.slugDeny,
    tagAllow: rule.tagAllow,
    tagDeny: rule.tagDeny,
  }));

  const vocabulary: SkillTagValue[] = skillTagVocabulary.tags.map((tag) => ({
    id: tag.id,
    tag: tag.tag,
  }));

  return {
    posture,
    projectId: project.id,
    projectName: project.name,
    rules,
    vocabulary,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${SKILL_AVAILABILITY_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { posture, projectId, projectName, rules, vocabulary } =
    props.loaderData;

  // Hooks

  // Setup
  const tagNames = vocabulary.map((tag) => tag.tag);

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
              className="mb-2"
              heading="h1"
              icon={BookOpenIcon}
              title={SKILL_AVAILABILITY_COPY.pageTitle}
            />
            <p className="text-muted-foreground text-sm">
              {SKILL_AVAILABILITY_COPY.pageDescription}
              {projectName != null ? ` Project: ${projectName}.` : ''}
            </p>
          </div>
          <Button asChild={true} variant="outline">
            <Link to="/skills">Back to skills</Link>
          </Button>
        </div>

        {projectId == null ? (
          <p className="text-muted-foreground text-sm" role="alert">
            No dogfood project (nx_project_name = &quot;
            {DOGFOOD_NX_PROJECT_NAME}&quot;) is provisioned, so there is no
            project to author rules for yet.
          </p>
        ) : (
          <>
            <SkillAvailabilityPostureCard
              hasRuleSet={posture != null}
              posture={posture}
            />
            <SkillAvailabilityRulesEditor rules={rules} vocabulary={tagNames} />
            <SkillTagVocabularyManager tags={vocabulary} />
          </>
        )}
      </div>
    </GlobalScreen>
  );
}

export const action = (args: Route.ActionArgs) => runAvailabilityAction(args);

export const ErrorBoundary = GlobalErrorBoundary;
