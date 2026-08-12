import { MAX_SLASH_COMMAND_RESULTS } from '~/routing/skills/config/autocomplete';
import {
  composeAutocompleteSkills,
  loadProjectSkillFlags,
  loadSkillAvailability,
} from '~/routing/skills/utils/autocomplete-entries';
import type { SkillsAutocompleteResponse } from '~/routing/skills/utils/autocomplete-entries';
import type { Route } from '@/app/routes/+types/skills.autocomplete';

export type {
  SkillAutocompleteEntry,
  SkillsAutocompleteResponse,
} from '~/routing/skills/utils/autocomplete-entries';

/**
 * Resource route (loader-only) backing the chat composer's `/`-command skill
 * picker: `/skills/autocomplete?q=`. Discovers skills from the running
 * checkout's filesystem (`discoverRepoSkills`), then merges the `projectSkills`
 * static flags/tags and the per-context `skillAvailability` on top — the same
 * pipeline as the `/skills` page. When the monorepo root cannot be resolved (a
 * deployed app with no checkout), `discoverRepoSkills(null)` returns `[]`, so
 * the client simply shows the empty label. Never throws on missing data.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<SkillsAutocompleteResponse> => {
  const query = args.url.searchParams.get('q') ?? '';

  const { discoverRepoSkills } =
    await import('~/routing/agents/data/discover-repo-skills.server');
  const { getMonorepoRoot } =
    await import('~/routing/agents/data/resolve-monorepo-root.server');

  const diskEntries = discoverRepoSkills(getMonorepoRoot());

  const [projectSkills, availability] = await Promise.all([
    loadProjectSkillFlags(args.request),
    loadSkillAvailability(args.request),
  ]);

  const skills = composeAutocompleteSkills(
    diskEntries,
    projectSkills,
    availability,
  );

  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') {
    return { query, skills, truncated: false };
  }

  const matches = skills.filter(
    (skill) =>
      skill.slug.toLowerCase().includes(trimmed) ||
      skill.description.toLowerCase().includes(trimmed),
  );

  return {
    query,
    skills: matches.slice(0, MAX_SLASH_COMMAND_RESULTS),
    truncated: matches.length > MAX_SLASH_COMMAND_RESULTS,
  };
};
