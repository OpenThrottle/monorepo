import * as React from 'react';
import { BookPlusIcon } from 'lucide-react';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { SITE_TITLE } from '~/global/config/settings';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import {
  SKILL_CREATE_FIELDS,
  isSkillCreateDestination,
} from '~/routing/skills/config/skill-create';
import { SkillCreateForm } from '~/routing/skills/components/SkillCreateForm';
import { useSkillCreateForm } from '~/routing/skills/hooks/useSkillCreateForm';
import type { Route } from '@/app/routes/+types/skills.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Skills', to: '/skills' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${SKILL_CREATE_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const form = useSkillCreateForm();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookPlusIcon}
          title={SKILL_CREATE_COPY.pageTitle}
        />
        <p className="text-muted-foreground text-sm">
          {SKILL_CREATE_COPY.introduction}
        </p>
      </div>

      {/* The refusal comes from the form's own fetcher, not `actionData` —
      a fetcher submission never populates that. See useSkillCreateForm. */}
      <SkillCreateForm error={form.error} form={form} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const content = formData.get(SKILL_CREATE_FIELDS.content);
  const destination = formData.get(SKILL_CREATE_FIELDS.destination);
  const slug = formData.get(SKILL_CREATE_FIELDS.slug);

  if (typeof content !== 'string' || content.trim().length === 0) {
    return { error: SKILL_CREATE_COPY.missingContentError };
  }

  if (typeof slug !== 'string') {
    return { error: SKILL_CREATE_COPY.invalidSlugError };
  }

  // Narrowed, never defaulted: a malformed POST must not silently pick a
  // destination — least of all the committed one.
  if (!isSkillCreateDestination(destination)) {
    return { error: SKILL_CREATE_COPY.invalidDestinationError };
  }

  // Dynamic import keeps the server-only module (and its `node:child_process`
  // dependency) out of the client bundle — the boundary pattern the sibling
  // skills routes use.
  const { createSkillFile } =
    await import('~/routing/skills/data/create-skill-file.server');

  const result = createSkillFile({ content, destination, slug });

  // Refusals render inline on the form; only a genuine success navigates.
  if (!result.ok) {
    return { error: result.error };
  }

  return redirect(`/skills/${encodeURIComponent(result.slug)}`);
};

export const ErrorBoundary = GlobalErrorBoundary;
