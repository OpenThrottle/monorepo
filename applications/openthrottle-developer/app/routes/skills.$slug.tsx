import * as React from 'react';
import { useFetcher } from 'react-router';
import { ChatDialog } from '@openthrottle/react-router-chat';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  loadComposerModels,
  loadRepositories,
} from '~/routing/home/data/models.server';
import { SkillDetail } from '~/routing/skills/components/SkillDetail';
import {
  SKILL_DETAIL_COPY,
  SKILL_RUN_COPY,
  SKILL_WRITE_COPY,
} from '~/routing/skills/data/data.copy';
import { useRunSkill } from '~/routing/skills/hooks/useRunSkill';
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

  // Deferred: the Run-skill modal needs discovered agent+model options and the
  // registered repositories that satisfy `repositoryId` for CLI backends. Model
  // discovery probes local model servers (cold-slow), so bundle both into one
  // naked promise (RR8 Single Fetch streams it) — the skill detail shell paints
  // immediately and the modal resolves this only when opened. Reuses the SAME
  // shared discovery helpers as the home composer; no duplication.
  const runOptions = Promise.all([
    loadComposerModels(args.request),
    loadRepositories(args.request),
  ]).then(([models, repositories]) => ({ models, repositories }));

  return { content, editable, entry, runOptions };
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
  const { content, editable, entry, runOptions } = props.loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const runSkill = useRunSkill();

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
        onRun={runSkill.onRun}
        onSave={handleSave}
        runOptions={runOptions}
        saveError={saveError}
        saving={saving}
      />

      {/* Controlled conversation surface: the run streams here once started. The
          trigger is visually hidden — the skill header's Run-now button drives
          `open` via the run hook. */}
      <ChatDialog
        messages={runSkill.messages}
        onOpenChange={runSkill.onConversationOpenChange}
        onSendMessage={runSkill.onSendFollowUp}
        open={runSkill.conversationOpen}
        title={SKILL_RUN_COPY.conversationTitle}
        trigger={<span aria-hidden={true} className="sr-only" />}
        variant="sheet"
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
