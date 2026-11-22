import {
  loadComposerModels,
  loadRepositories,
} from '~/routing/home/utils/models.server';
import type { RunSkillRunOptions } from '~/routing/skills/components/SkillRunControl';

/**
 * @description Discovered agent+model options and registered repositories for
 * the Run-skill modal. Model discovery probes local model servers (cold-slow),
 * so callers stream the returned promise unawaited (RR8 Single Fetch). Reuses
 * the same discovery helpers as the home composer.
 */
export const loadSkillRunOptions = (
  request: Request,
): Promise<RunSkillRunOptions> => {
  return Promise.all([
    loadComposerModels(request),
    loadRepositories(request),
  ]).then(([models, repositories]) => ({ models, repositories }));
};
