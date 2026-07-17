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
  AddSkillAvailabilityRuleDocument,
  AddSkillTagDocument,
  DeleteSkillAvailabilityRuleSetDocument,
  RemoveSkillAvailabilityRuleDocument,
  RemoveSkillTagDocument,
  RenameSkillTagDocument,
  type SkillAvailabilityRuleInput,
  SkillAvailabilityAuthoringRuleSetDocument,
  SkillAvailabilityAuthoringVocabularyDocument,
  SkillAvailabilityProjectsDocument,
  UpdateSkillAvailabilityRuleDocument,
  UpsertSkillAvailabilityRuleSetDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillAvailabilityPostureCard } from '~/routing/skills/components/SkillAvailabilityPostureCard';
import { SkillAvailabilityRulesEditor } from '~/routing/skills/components/SkillAvailabilityRulesEditor';
import { SkillTagVocabularyManager } from '~/routing/skills/components/SkillTagVocabularyManager';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import {
  isSkillAvailabilityEnvironment,
  isSkillAvailabilityPosture,
  parseListField,
  type SkillAvailabilityEnvironment,
  type SkillAvailabilityPosture,
  type SkillAvailabilityRuleValue,
  type SkillTagValue,
} from '~/routing/skills/utils/skill-availability';
import type { Route } from '@/app/routes/+types/skills.availability';

/** nx_project_name of the dogfood project the monorepo's own skills reconcile into. */
const DOGFOOD_NX_PROJECT_NAME = 'monorepo';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Availability',
  links: (_match) => [{ children: 'Skills', to: '/skills' }],
};

/**
 * @description Resolve the dogfood project id the read view uses. The `skillAvailability` resolver
 * defaults to `nx_project_name = 'monorepo'` when `projectId` is omitted, but the rule-set query and
 * every mutation require a concrete id — so the authoring surface resolves the same project here.
 * Returns null when no monorepo project is provisioned.
 */
const resolveDogfoodProject = async (
  request: Request,
): Promise<{ id: string; name: string } | null> => {
  const { projects } = await executeGraphqlWithAuth(
    request,
    SkillAvailabilityProjectsDocument,
  );

  const project = projects.find((candidate) => {
    return candidate.nxProjectName === DOGFOOD_NX_PROJECT_NAME;
  });

  return project == null ? null : { id: project.id, name: project.name };
};

/** Narrow a server `environment` string to a known env, degrading unknown values to null (all). */
const toEnvironmentValue = (
  environment: string | null,
): SkillAvailabilityEnvironment | null => {
  if (environment != null && isSkillAvailabilityEnvironment(environment)) {
    return environment;
  }
  return null;
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

/** Build the rule mutation input from the submitted form fields. */
const readRuleInput = (formData: FormData): SkillAvailabilityRuleInput => {
  const environment = formData.get('environment');
  return {
    environment:
      typeof environment === 'string' && environment !== ''
        ? environment
        : null,
    slugAllow: parseListField(formData.get('slugAllow')),
    slugDeny: parseListField(formData.get('slugDeny')),
    tagAllow: parseListField(formData.get('tagAllow')),
    tagDeny: parseListField(formData.get('tagDeny')),
  };
};

type ActionResult = {
  readonly error?: string;
  readonly intent: string;
  readonly ok?: boolean;
};

export const action = async (args: Route.ActionArgs): Promise<ActionResult> => {
  const formData = await args.request.formData();
  const intentField = formData.get('intent');
  const intent = typeof intentField === 'string' ? intentField : '';

  try {
    if (intent === 'upsertRuleSet') {
      const postureField = formData.get('posture');
      const posture = typeof postureField === 'string' ? postureField : 'allow';
      const project = await resolveDogfoodProject(args.request);
      if (project == null) {
        return { error: 'No dogfood project is provisioned.', intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        UpsertSkillAvailabilityRuleSetDocument,
        { posture, projectId: project.id },
      );
      return { intent, ok: true };
    }

    if (intent === 'deleteRuleSet') {
      const project = await resolveDogfoodProject(args.request);
      if (project == null) {
        return { error: 'No dogfood project is provisioned.', intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        DeleteSkillAvailabilityRuleSetDocument,
        { projectId: project.id },
      );
      return { intent, ok: true };
    }

    if (intent === 'addRule') {
      const project = await resolveDogfoodProject(args.request);
      if (project == null) {
        return { error: 'No dogfood project is provisioned.', intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        AddSkillAvailabilityRuleDocument,
        { input: readRuleInput(formData), projectId: project.id },
      );
      return { intent, ok: true };
    }

    if (intent === 'updateRule') {
      const ruleId = formData.get('ruleId');
      if (typeof ruleId !== 'string' || ruleId === '') {
        return { error: 'Missing rule id.', intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        UpdateSkillAvailabilityRuleDocument,
        { input: readRuleInput(formData), ruleId },
      );
      return { intent, ok: true };
    }

    if (intent === 'removeRule') {
      const ruleId = formData.get('ruleId');
      if (typeof ruleId !== 'string' || ruleId === '') {
        return { error: 'Missing rule id.', intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        RemoveSkillAvailabilityRuleDocument,
        { ruleId },
      );
      return { intent, ok: true };
    }

    if (intent === 'addTag') {
      const tag = formData.get('tag');
      if (typeof tag !== 'string' || tag === '') {
        return { error: 'Tag is required.', intent };
      }
      await executeGraphqlWithAuth(args.request, AddSkillTagDocument, {
        input: { tag },
      });
      return { intent, ok: true };
    }

    if (intent === 'renameTag') {
      const from = formData.get('from');
      const to = formData.get('to');
      if (
        typeof from !== 'string' ||
        from === '' ||
        typeof to !== 'string' ||
        to === ''
      ) {
        return { error: 'Both the current and new tag are required.', intent };
      }
      await executeGraphqlWithAuth(args.request, RenameSkillTagDocument, {
        input: { from, to },
      });
      return { intent, ok: true };
    }

    if (intent === 'removeTag') {
      const tag = formData.get('tag');
      if (typeof tag !== 'string' || tag === '') {
        return { error: 'Tag is required.', intent };
      }
      await executeGraphqlWithAuth(args.request, RemoveSkillTagDocument, {
        input: { tag },
      });
      return { intent, ok: true };
    }

    return { error: `Unknown intent "${intent}".`, intent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, intent };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
