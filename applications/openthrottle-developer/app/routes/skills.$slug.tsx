import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  getActionError,
  isFetcherBusy,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { Route } from '@/app/routes/+types/skills.$slug';
import { SITE_TITLE } from '~/global/config/settings';
import {
  runSkillRecordTagAction,
  SKILL_RECORD_TAG_INTENTS,
} from '~/routing/skills/actions/project-skill-tags';
import { SkillDetailTabs } from '~/routing/skills/components/SkillDetailTabs';
import { SkillRunConversation } from '~/routing/skills/components/SkillRunConversation';
import {
  SKILL_DETAIL_COPY,
  SKILL_WRITE_COPY,
} from '~/routing/skills/data/data.copy';
import { useRunSkill } from '~/routing/skills/hooks/useRunSkill';
import { loadSkillRunOptions } from '~/routing/skills/utils/loadSkillRunOptions.server';
import { mergeRepoSkillsWithProjectSkills } from '~/routing/skills/utils/mergeRepoSkillsWithProjectSkills';
import {
  loadProjectSkillFlags,
  loadSkillTagVocabulary,
} from '~/routing/skills/utils/skill-index-loaders';
import { loadSkillDetailUsage } from '~/routing/skills/utils/skill-usage-loaders';

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
    await import('~/routing/skills/utils/readSkillFileBySlug.server');

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
  const metadata = isOrphan ? {} : disk.metadata;
  const rawContent = isOrphan ? '' : disk.rawContent;

  // Deferred (naked promises, RR8 Single Fetch): the Run-skill modal's
  // agent/model/repository options and the per-skill 30-day usage. The detail
  // shell paints immediately; failures degrade inside the loader helpers.
  const runOptions = loadSkillRunOptions(args.request);
  const usage = loadSkillDetailUsage(args.request, entry.slug);

  return {
    content,
    editable,
    entry,
    metadata,
    rawContent,
    runOptions,
    tagVocabulary,
    usage,
  };
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
  const {
    content,
    editable,
    entry,
    rawContent,
    runOptions,
    tagVocabulary,
    usage,
  } = props.loaderData;

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
        rawContent={rawContent}
        runOptions={runOptions}
        saveError={saveError}
        saving={saving}
        tagPending={tagPending}
        tagVocabulary={tagVocabulary}
        usage={usage}
      />

      <SkillRunConversation runSkill={runSkill} />
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
    await import('~/routing/skills/utils/writeSkillFileBySlug.server');

  const content = formData.get('content');

  if (typeof content !== 'string') {
    return { error: SKILL_WRITE_COPY.missingContentError, ok: false as const };
  }

  return writeSkillFileBySlug(args.params.slug, content);
};

export const ErrorBoundary = GlobalErrorBoundary;
