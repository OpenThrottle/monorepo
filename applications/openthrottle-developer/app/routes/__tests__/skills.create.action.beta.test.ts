// @vitest-environment node
/**
 * The flag-on half of the create action's FEATURE_BETA_PREVIEW gate. It lives
 * in its own file because the flag is a module-level const resolved at import
 * time: one module graph can only ever see one value, so the two states cannot
 * share a suite. The flag-off half — the default, since the flag is unset in
 * this environment — is in skills.create.action.test.ts.
 */
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@openthrottle/react-router-utils')
  >()),
  FEATURE_BETA_PREVIEW: true,
}));

vi.mock('~/routing/skills/data/create-skill-file.server', () => ({
  createSkillFile: vi.fn(),
}));

const { createSkillFile } =
  await import('~/routing/skills/data/create-skill-file.server');
const { action } = await import('../skills.create');

const mockCreateSkillFile = vi.mocked(createSkillFile);

const submit = async (
  fields: Readonly<Record<string, string>>,
): Promise<unknown> => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  const request = new Request('http://localhost/skills/create', {
    body: formData,
    method: 'POST',
  });

  return action({
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/create',
    request,
    url: new URL(request.url),
  });
};

describe('routes/skills.create.tsx action with FEATURE_BETA_PREVIEW on', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('accepts the openthrottle destination', async () => {
    mockCreateSkillFile.mockReturnValue({ ok: true, slug: 'my-new-skill' });

    const response = await submit({
      content: '---\nname: my-new-skill\ndescription: Does.\n---\n',
      destination: SKILL_CREATE_DESTINATIONS.openthrottle,
      slug: 'my-new-skill',
    });

    expect(mockCreateSkillFile).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
      }),
    );
    expect(response).toBeInstanceOf(Response);
  });
});
