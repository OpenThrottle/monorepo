import * as React from 'react';
import { useFetcher } from 'react-router';
import { ChatDialog } from '@openthrottle/react-router-chat';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  getActionError,
  isFetcherBusy,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { GetSkillDetailUsageDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import {
  loadComposerModels,
  loadRepositories,
} from '~/routing/home/data/models.server';
import { SkillDetailTabs } from '~/routing/skills/components/SkillDetailTabs';
import { SKILL_USAGE_RANGE_DAYS } from '~/routing/skills/config/skill-usage';
import {
  SKILL_DETAIL_COPY,
  SKILL_RUN_COPY,
  SKILL_WRITE_COPY,
} from '~/routing/skills/data/data.copy';
import {
  loadProjectSkillFlags,
  loadSkillTagVocabulary,
} from '~/routing/skills/data/skill-index-loaders';
import { useRunSkill } from '~/routing/skills/hooks/useRunSkill';
import { mergeRepoSkillsWithProjectSkills } from '~/routing/skills/utils/merge-project-skills';
import { toSkillDetailUsageData } from '~/routing/skills/utils/to-skill-detail-usage-data';
import {
  runSkillRecordTagAction,
  SKILL_RECORD_TAG_INTENTS,
} from '~/routing/skills/actions/project-skill-tags';
import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';
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

  const disk = readSkillFileBySlug(args.params.slug);
  const [projectSkills, tagVocabulary] = await Promise.all([
    loadProjectSkillFlags(args.request),
    loadSkillTagVocabulary(args.request),
  ]);
  const merged = mergeRepoSkillsWithProjectSkills(
    disk.entry == null ? [] : [disk.entry],
    projectSkills,
  );
  const entry = merged.find((candidate) => candidate.slug === args.params.slug);

  if (!entry) {
    throw new Response(SKILL_DETAIL_COPY.notFoundStatusText, { status: 404 });
  }

  const isOrphan = entry.orphanedAt != null;
  const content = isOrphan ? '' : disk.content;
  const editable = isOrphan ? false : disk.editable;

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

  // Deferred per-skill usage over a fixed 30-day window (YYYY-MM-DD, matching
  // the /usage contract). Streamed as a naked promise so the SKILL.md shell
  // paints immediately. `skillUsage` is guarded by SETTINGS_READ; any failure
  // (missing permission, server error) resolves to the unavailable sentinel so
  // the route still renders 200 and degrades to a notice instead of throwing.
  const end = new Date();
  const start = new Date(
    end.getTime() - SKILL_USAGE_RANGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const usage: Promise<SkillDetailUsageData> = executeGraphqlWithAuth(
    args.request,
    GetSkillDetailUsageDocument,
    {
      end: end.toISOString().slice(0, 10),
      skillName: entry.slug,
      start: start.toISOString().slice(0, 10),
    },
  )
    .then(({ skillUsage }) => toSkillDetailUsageData(skillUsage))
    .catch(() => ({ available: false as const }));

  return { content, editable, entry, runOptions, tagVocabulary, usage };
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
  const { content, editable, entry, runOptions, tagVocabulary, usage } =
    props.loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const runSkill = useRunSkill();

  // Setup
  const saving = isFetcherBusy(fetcher);
  const saveError = getActionError(fetcher.data);
  const tagPending =
    fetcher.state !== 'idle' &&
    typeof fetcher.formData?.get('intent') === 'string' &&
    fetcher.formData.get('intent') !== '';

  // Handlers
  const handleSave = (draft: string): void => {
    void fetcher.submit({ content: draft }, { method: 'post' });
  };
  const submitTagIntent = (intent: string, tag?: string): void => {
    const payload: Record<string, string> = { intent, slug: entry.slug };
    if (tag != null) {
      payload.tag = tag;
    }
    void fetcher.submit(payload, { method: 'post' });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SkillDetailTabs
        content={content}
        editable={editable}
        entry={entry}
        onAddTag={(tag) =>
          submitTagIntent(SKILL_RECORD_TAG_INTENTS.ADD_TAG, tag)
        }
        onRemoveOrphan={() =>
          submitTagIntent(SKILL_RECORD_TAG_INTENTS.REMOVE_ORPHAN)
        }
        onRemoveTag={(tag) =>
          submitTagIntent(SKILL_RECORD_TAG_INTENTS.REMOVE_TAG, tag)
        }
        onRun={runSkill.onRun}
        onSave={handleSave}
        runOptions={runOptions}
        saveError={saveError}
        saving={saving}
        tagPending={tagPending}
        tagVocabulary={tagVocabulary}
        usage={usage}
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
  const formData = await args.request.formData();
  const intent = formData.get('intent');
  if (typeof intent === 'string' && intent.length > 0) {
    return runSkillRecordTagAction(args.request, formData);
  }

  const { writeSkillFileBySlug } =
    await import('~/routing/skills/data/write-skill-file.server');

  const content = formData.get('content');

  if (typeof content !== 'string') {
    return { error: SKILL_WRITE_COPY.missingContentError, ok: false as const };
  }

  return writeSkillFileBySlug(args.params.slug, content);
};

export const ErrorBoundary = GlobalErrorBoundary;
