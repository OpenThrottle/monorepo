import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  AddSkillAvailabilityRuleDocument,
  AddSkillTagDocument,
  DeleteSkillAvailabilityRuleSetDocument,
  RemoveSkillAvailabilityRuleDocument,
  RemoveSkillTagDocument,
  RenameSkillTagDocument,
  SkillAvailabilityProjectsDocument,
  UpdateSkillAvailabilityRuleDocument,
  UpsertSkillAvailabilityRuleSetDocument,
} from '~/__generated__/graphql';
import { DOGFOOD_NX_PROJECT_NAME } from '~/routing/skills/config/availability';
import { readRuleInput } from '~/routing/skills/utils/skill-availability-action';
import type { Route } from '@/app/routes/+types/skills.availability';

export interface AvailabilityActionResult {
  readonly error?: string;
  readonly intent: string;
  readonly ok?: boolean;
}

/**
 * @description Resolve the dogfood project id the read view uses. The `skillAvailability` resolver
 * defaults to `nx_project_name = 'monorepo'` when `projectId` is omitted, but the rule-set query and
 * every mutation require a concrete id — so the authoring surface resolves the same project here.
 * Returns null when no monorepo project is provisioned.
 */
export const resolveDogfoodProject = async (
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

/**
 * @description Availability authoring mutations (rule set, rules, tag vocabulary),
 * dispatched by `intent`. Extracted from the route action per route-primitive-shape
 * R4 so the route file stays a thin adapter.
 */
export const runAvailabilityAction = async (
  args: Route.ActionArgs,
): Promise<AvailabilityActionResult> => {
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
