import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import {
  AddSkillAvailabilityRuleDocument,
  DeleteSkillAvailabilityRuleSetDocument,
  RemoveSkillAvailabilityRuleDocument,
  SkillAvailabilityProjectsDocument,
  UpdateSkillAvailabilityRuleDocument,
  UpsertSkillAvailabilityRuleSetDocument,
} from '~/__generated__/graphql';
import { DOGFOOD_NX_PROJECT_NAME } from '~/routing/skills/config/availability';
import { readRuleInput } from '~/routing/skills/utils/skill-availability-action';
import type { Route } from '@/app/routes/+types/skills.availability';

/**
 * Loose-variable mutations (`upsertRuleSet`, `updateRule`, `removeRule`) do not
 * take a single `input:` argument — their scalar fields are validated with
 * these composed schemas (the `projectId` is resolved server-side, not from the
 * form). `strict: false` at the call site lets the rule-authoring form's other
 * fields — parsed separately by `readRuleInput` — pass through untouched.
 */
const PostureSchema = z.object({ posture: z.string().min(1).default('allow') });
const RuleIdSchema = z.object({ ruleId: z.string().min(1) });

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
      const parsed = parseFormData(formData, PostureSchema, { strict: false });
      const posture = parsed.success ? parsed.data.posture : 'allow';
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
      const parsed = parseFormData(formData, RuleIdSchema, { strict: false });
      if (!parsed.success) {
        return { error: parsed.error, intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        UpdateSkillAvailabilityRuleDocument,
        { input: readRuleInput(formData), ruleId: parsed.data.ruleId },
      );
      return { intent, ok: true };
    }

    if (intent === 'removeRule') {
      const parsed = parseFormData(formData, RuleIdSchema, { strict: false });
      if (!parsed.success) {
        return { error: parsed.error, intent };
      }
      await executeGraphqlWithAuth(
        args.request,
        RemoveSkillAvailabilityRuleDocument,
        { ruleId: parsed.data.ruleId },
      );
      return { intent, ok: true };
    }

    return { error: `Unknown intent "${intent}".`, intent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, intent };
  }
};
