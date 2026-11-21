import type { Route } from '@/app/routes/+types/resources.rule-preview';
import type { RulePreviewState } from '~/routing/rules/types';
import { loadRulePreview } from '~/routing/rules/utils/rule-preview.server';
import { parseRulePreviewQuery } from '~/routing/rules/utils/rule-preview-params';

/**
 * Resource route (loader-only) backing the live "matches N plans" summary in the rule form —
 * `/resources/rule-preview?actionType=&repositoryId=&status=&environment=&tagAll=`. A GET because
 * it is a read-only dry run: nothing is written and no action is dispatched. The GraphQL client
 * is server-only, so the form debounces a `useFetcher().load` here via `useRulePreview`.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<RulePreviewState> => {
  const params = new URL(args.request.url).searchParams;

  return loadRulePreview(args.request, parseRulePreviewQuery(params));
};
