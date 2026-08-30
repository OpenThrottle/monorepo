// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';

// The action dynamically imports this module; mocking it keeps the action test
// about parsing, narrowing and the response shape rather than about disk.
vi.mock('~/routing/skills/data/create-skill-file.server', () => ({
  createSkillFile: vi.fn(),
}));

const { createSkillFile } =
  await import('~/routing/skills/data/create-skill-file.server');
const { action } = await import('../skills.create');

const mockCreateSkillFile = vi.mocked(createSkillFile);

const VALID_CONTENT = '---\nname: my-new-skill\ndescription: Does.\n---\n';

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

  // The action reads only `request`; the rest is present to satisfy the
  // signature.
  return action({
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/create',
    request,
    url: new URL(request.url),
  });
};

const validFields = {
  content: VALID_CONTENT,
  destination: SKILL_CREATE_DESTINATIONS.personal,
  slug: 'my-new-skill',
};

describe('routes/skills.create.tsx action', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('redirects to the new skill on success', async () => {
    mockCreateSkillFile.mockReturnValue({ ok: true, slug: 'my-new-skill' });

    const response = await submit(validFields);

    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) {
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/skills/my-new-skill');
    }
  });

  test('passes the parsed fields straight through', async () => {
    mockCreateSkillFile.mockReturnValue({ ok: true, slug: 'my-new-skill' });

    await submit({
      ...validFields,
      destination: SKILL_CREATE_DESTINATIONS.repo,
    });

    expect(mockCreateSkillFile).toHaveBeenCalledOnce();
    expect(mockCreateSkillFile).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: SKILL_CREATE_DESTINATIONS.repo,
        slug: 'my-new-skill',
      }),
    );
  });

  // Form encoding rewrites every newline as CRLF on the wire, so the action
  // genuinely receives \r\n here. The server module normalizes it back to LF;
  // this pins the fact that the encoding does it, so the normalization is not
  // mistaken for dead code later.
  test('receives CRLF-encoded content from the form', async () => {
    mockCreateSkillFile.mockReturnValue({ ok: true, slug: 'my-new-skill' });

    await submit(validFields);

    const received = mockCreateSkillFile.mock.calls[0]?.[0].content;
    expect(received).toContain('\r\n');
    expect(received?.replaceAll('\r\n', '\n')).toBe(VALID_CONTENT);
  });

  // Refusals render inline on the form, so they must return, not throw.
  test('returns a refusal rather than throwing', async () => {
    mockCreateSkillFile.mockReturnValue({
      error: 'Create rejected — taken.',
      ok: false,
    });

    await expect(submit(validFields)).resolves.toEqual({
      error: 'Create rejected — taken.',
    });
  });

  describe('input narrowing, before the server module is reached', () => {
    test.each([
      ['a missing content field', { destination: 'personal', slug: 'a-slug' }],
      [
        'blank content',
        { content: '   ', destination: 'personal', slug: 'a-slug' },
      ],
    ])('refuses %s', async (_label, fields) => {
      await expect(submit(fields)).resolves.toEqual({
        error: SKILL_CREATE_COPY.missingContentError,
      });
      expect(mockCreateSkillFile).not.toHaveBeenCalled();
    });

    test('refuses a missing slug field', async () => {
      await expect(
        submit({ content: VALID_CONTENT, destination: 'personal' }),
      ).resolves.toEqual({ error: SKILL_CREATE_COPY.invalidSlugError });
      expect(mockCreateSkillFile).not.toHaveBeenCalled();
    });

    // Never defaulted: a malformed POST must not silently pick a destination,
    // least of all the committed one.
    test.each([
      ['an unrecognized destination', 'somewhere-else'],
      ['an empty destination', ''],
    ])('refuses %s instead of defaulting', async (_label, destination) => {
      await expect(
        submit({ content: VALID_CONTENT, destination, slug: 'a-slug' }),
      ).resolves.toEqual({
        error: SKILL_CREATE_COPY.invalidDestinationError,
      });
      expect(mockCreateSkillFile).not.toHaveBeenCalled();
    });

    test('refuses a POST with no destination field at all', async () => {
      await expect(
        submit({ content: VALID_CONTENT, slug: 'a-slug' }),
      ).resolves.toEqual({
        error: SKILL_CREATE_COPY.invalidDestinationError,
      });
      expect(mockCreateSkillFile).not.toHaveBeenCalled();
    });
  });
});
