import type { SearchChunk } from '~/__generated__/graphql';
import { SEARCH_RESULT_COPY } from '~/routing/search/data/data.copy';
import type {
  SearchResultContext,
  SearchResultTarget,
  SearchResultView,
} from '~/routing/search/types/search-result-view';
import { githubBlobHref } from '~/routing/search/utils/githubBlobHref';
import { normalizeSource } from '~/routing/search/utils/normalizeSource';
import { planOrTaskDetailHref } from '~/routing/search/utils/planOrTaskDetailHref';

const NO_TARGET: SearchResultTarget = { kind: 'none' };

function present(value: string | null | undefined): value is string {
  return value != null && value !== '';
}

/** @description Drops a leading copy of the title from chunk text, so a snippet never repeats its heading. */
function toSnippet(content: string, title: string): string {
  const trimmed = content.trimStart();

  if (title === '' || !trimmed.startsWith(title)) {
    return trimmed;
  }

  return trimmed.slice(title.length).trimStart();
}

function internal(href: string): SearchResultTarget {
  return { href, kind: 'internal' };
}

function toDocumentationView(
  result: SearchChunk,
  relevancePercent: number,
): SearchResultView {
  const { sourcePath, sourceRepo, sourceSha } = result;
  let context: SearchResultContext | null = null;
  let target = NO_TARGET;

  if (present(sourceRepo)) {
    context = { label: sourceRepo, target: NO_TARGET };

    if (present(sourcePath)) {
      const href = githubBlobHref(sourceRepo, sourcePath, sourceSha);

      target = { href, kind: 'external' };
    }
  }

  const title = sourcePath ?? SEARCH_RESULT_COPY.fallbackTitle.documentation;

  return {
    context,
    relevancePercent,
    snippet: toSnippet(result.content, title),
    source: 'documentation',
    target,
    title,
  };
}

/**
 * @description Maps a search chunk to the one header shape every result card renders:
 * the pill's source, a linked title, the meta line's context link, and relevance.
 */
export function toSearchResultView(result: SearchChunk): SearchResultView {
  const source = normalizeSource(result.source);
  const { planId, planTitle, taskId, taskTitle } = result;
  const relevancePercent = Math.round(result.similarity * 100);

  if (source === 'documentation') {
    return toDocumentationView(result, relevancePercent);
  }

  const planLabel = planTitle ?? SEARCH_RESULT_COPY.fallbackTitle.plan;
  const taskLabel = taskTitle ?? SEARCH_RESULT_COPY.fallbackTitle.task;
  const hasPlan = present(planId);
  const planTarget = hasPlan ? internal(`/plans/${planId}`) : NO_TARGET;
  let taskTarget = NO_TARGET;

  if (hasPlan && present(taskId)) {
    taskTarget = internal(planOrTaskDetailHref(planId, taskId));
  }

  if (source === 'task') {
    const context = hasPlan ? { label: planLabel, target: planTarget } : null;

    return {
      context,
      relevancePercent,
      snippet: toSnippet(result.content, taskLabel),
      source,
      target: taskTarget,
      title: taskLabel,
    };
  }

  const hasRelatedTask = taskTarget.kind !== 'none';
  const relatedTask = hasRelatedTask
    ? { label: taskLabel, target: taskTarget }
    : null;

  return {
    context: relatedTask,
    relevancePercent,
    snippet: toSnippet(result.content, planLabel),
    source,
    target: planTarget,
    title: planLabel,
  };
}
