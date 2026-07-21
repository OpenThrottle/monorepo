import * as React from 'react';
import { useFetcher } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { SkillDetail } from '~/routing/skills/components/SkillDetail';
import {
  SKILL_DETAIL_COPY,
  SKILL_WRITE_COPY,
} from '~/routing/skills/data/data.copy';
import type { Route } from '@/app/routes/+types/skills.$slug';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.params.slug,
  links: (_match) => [
    {
      children: 'Skills',
      label: 'Skills',
      to: '/skills',
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { readSkillFileBySlug } =
    await import('~/routing/skills/data/read-skill-file.server');

  const { content, editable, entry } = readSkillFileBySlug(args.params.slug);

  if (!entry) {
    throw new Response(SKILL_DETAIL_COPY.notFoundStatusText, { status: 404 });
  }

  return { content, editable, entry };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  return [{ title: `${args.params.slug} | Skills | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { content, editable, entry } = props.loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();

  // Setup
  const saving = fetcher.state !== 'idle';
  const saveError =
    fetcher.data && fetcher.data.ok === false ? fetcher.data.error : undefined;

  // Handlers
  const handleSave = (draft: string): void => {
    void fetcher.submit({ content: draft }, { method: 'post' });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SkillDetail
        content={content}
        editable={editable}
        entry={entry}
        onSave={handleSave}
        saveError={saveError}
        saving={saving}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { writeSkillFileBySlug } =
    await import('~/routing/skills/data/write-skill-file.server');

  const formData = await args.request.formData();
  const content = formData.get('content');

  if (typeof content !== 'string') {
    return { error: SKILL_WRITE_COPY.missingContentError, ok: false as const };
  }

  return writeSkillFileBySlug(args.params.slug, content);
};

export const ErrorBoundary = GlobalErrorBoundary;
