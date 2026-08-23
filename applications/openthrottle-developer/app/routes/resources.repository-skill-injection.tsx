import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { UpdateRepositoryDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.repository-skill-injection';

/** JSON shape returned by the inline repositories-table skill-injection toggle. */
export interface RepositorySkillInjectionActionResult {
  readonly enabled: boolean;
  readonly errorMessage: string | null;
  readonly repositoryId: string;
}

/**
 * Resource route action backing the /settings/repositories inline skill-injection toggle —
 * `POST /resources/repository-skill-injection` with `repositoryId` + `enabled` fields.
 *
 * The mutation sends ONLY `foreignSkillInjectionEnabled` and `id`: every other field on
 * `UpdateRepositoryInput` is optional and the server leaves omitted fields untouched, so a
 * flag-only patch cannot clobber the repository's name, default branch, or linked project.
 * The server re-checks permissions, so a forged post is rejected there. On failure the
 * pre-toggle value comes back in `enabled` so the caller reverts its optimistic state.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<RepositorySkillInjectionActionResult> => {
  const formData = await args.request.formData();
  const repositoryId = String(formData.get('repositoryId') ?? '');
  const enabled = formData.get('enabled') === 'true';

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      UpdateRepositoryDocument,
      { input: { foreignSkillInjectionEnabled: enabled, id: repositoryId } },
    );

    // Read the flag back off the persisted checkouts rather than echoing the request:
    // the opt-in is stored per checkout and flipped for all of them together.
    return {
      enabled: (data.updateRepository.checkouts ?? []).some(
        (checkout) => checkout.foreignSkillInjectionEnabled,
      ),
      errorMessage: null,
      repositoryId,
    };
  } catch (error) {
    // Report the pre-toggle state so the optimistic UI can revert.
    return {
      enabled: !enabled,
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Failed to update skill injection.',
      repositoryId,
    };
  }
};
