import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';
import { useSkillCreateForm } from '../useSkillCreateForm';
import type { UseSkillCreateFormResult } from '../useSkillCreateForm';

/**
 * The hook calls `useFetcher`, so it needs a router above it. `renderHook`'s
 * `wrapper` cannot supply one — `createRoutesStub` renders its own routes and
 * takes no children — so the hook runs inside a stub route and hands its result
 * back through a probe. The getter re-reads the box on every assertion, so it
 * always reflects the latest render.
 */
interface RenderedCreateForm {
  readonly current: UseSkillCreateFormResult;
  /** Records the FormData each submission actually posts. */
  readonly submissions: FormData[];
}

const renderCreateForm = (
  actionResult: { error?: string } = {},
): RenderedCreateForm => {
  const captured: { current: UseSkillCreateFormResult | undefined } = {
    current: undefined,
  };
  const submissions: FormData[] = [];

  const Probe = (): React.ReactElement => {
    captured.current = useSkillCreateForm();
    return <div />;
  };

  // The stub route needs a real action: `useFetcher` posts to the current
  // route, and a route without one turns every submission into an error.
  const RoutesStub = createRoutesStub([
    {
      Component: Probe,
      action: async ({ request }) => {
        submissions.push(await request.formData());
        return actionResult;
      },
      path: '/',
    },
  ]);
  render(<RoutesStub />);

  return {
    get current(): UseSkillCreateFormResult {
      const form = captured.current;
      if (form === undefined) {
        throw new Error('the probe never rendered');
      }
      return form;
    },
    submissions,
  };
};

const pressSaveShortcut = (): void => {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 's',
        metaKey: true,
      }),
    );
  });
};

describe('useSkillCreateForm', () => {
  describe('the seeded scaffold', () => {
    test('opens pre-filled with a valid scaffold', () => {
      const form = renderCreateForm();

      expect(form.current.content).toContain('---');
      expect(form.current.content).toContain('name: my-new-skill');
      expect(form.current.isDocumentDirty).toBe(false);
    });

    test('rewrites the frontmatter as the name is typed', () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));

      expect(form.current.content).toContain('name: my-real-skill');
      expect(form.current.content).not.toContain('name: my-new-skill');
    });

    test('rewrites the frontmatter as the description is typed', () => {
      const form = renderCreateForm();

      act(() => form.current.setDescription('Does a specific thing.'));

      expect(form.current.content).toContain(
        'description: Does a specific thing.',
      );
    });

    test('rewrites the frontmatter as tags are typed', () => {
      const form = renderCreateForm();

      act(() => form.current.setTags('backend, testing'));

      expect(form.current.content).toContain('tags: [backend, testing]');
    });
  });

  describe('once the author edits the document', () => {
    // The trap this exists to prevent: silently clobbering hand-written
    // frontmatter every time a metadata field changes.
    test('the document wins and the fields stop overwriting it', () => {
      const form = renderCreateForm();

      act(() =>
        form.current.handleEditorChange('---\nname: hand-written\n---'),
      );
      expect(form.current.isDocumentDirty).toBe(true);

      act(() => form.current.setDescription('A description typed afterwards.'));

      expect(form.current.content).toBe('---\nname: hand-written\n---');
      expect(form.current.content).not.toContain(
        'A description typed afterwards.',
      );
    });

    test('a later name change does not clobber the document either', () => {
      const form = renderCreateForm();

      act(() => form.current.handleEditorChange('my hand-written body'));
      act(() => form.current.setSlug('renamed-skill'));

      expect(form.current.content).toBe('my hand-written body');
    });

    // Monaco keys one model per path; a path that kept tracking the slug would
    // rebuild the model — and drop the undo stack — on every keystroke.
    test('freezes the editor path so the undo stack survives', () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('first-name'));
      const pathBeforeEditing = form.current.editorPath;
      expect(pathBeforeEditing).toBe('first-name/SKILL.md');

      act(() => form.current.handleEditorChange('edited'));
      act(() => form.current.setSlug('second-name'));

      expect(form.current.editorPath).toBe(pathBeforeEditing);
    });

    test('treats a cleared editor as an empty document, not a reset', () => {
      const form = renderCreateForm();

      act(() => form.current.handleEditorChange(undefined));

      expect(form.current.isDocumentDirty).toBe(true);
      expect(form.current.content).toBe('');
    });
  });

  describe('the editor path before any edit', () => {
    test('tracks the slug and the destination', () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));
      expect(form.current.editorPath).toBe('my-real-skill/SKILL.md');

      act(() => form.current.setDestination(SKILL_CREATE_DESTINATIONS.repo));
      expect(form.current.editorPath).toBe('skills/my-real-skill/SKILL.md');
    });
  });

  describe('validation', () => {
    test('says nothing about an untouched slug field', () => {
      const form = renderCreateForm();

      expect(form.current.slugError).toBeUndefined();
    });

    // Feedback before a submit, rather than only after a server refusal.
    test.each(['My_Skill', 'my skill', 'my--skill', 'my-skill-'])(
      'complains about the non-kebab slug %s',
      (slug) => {
        const form = renderCreateForm();

        act(() => form.current.setSlug(slug));

        expect(form.current.slugError).toBeDefined();
        expect(form.current.canSubmit).toBe(false);
      },
    );

    test('accepts a valid kebab-case slug', () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));

      expect(form.current.slugError).toBeUndefined();
    });

    test('blocks submit until both a slug and a description are supplied', () => {
      const form = renderCreateForm();

      expect(form.current.canSubmit).toBe(false);

      act(() => form.current.setSlug('my-real-skill'));
      expect(form.current.canSubmit).toBe(false);

      act(() => form.current.setDescription('Does a thing.'));
      expect(form.current.canSubmit).toBe(true);
    });
  });

  describe('submission', () => {
    test('defaults to the personal destination', () => {
      const form = renderCreateForm();

      expect(form.current.destination).toBe(SKILL_CREATE_DESTINATIONS.personal);
    });

    test('submits the slug, content and destination on ⌘S', async () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));
      act(() => form.current.setDescription('Does a thing.'));
      const submittedContent = form.current.content;

      pressSaveShortcut();

      await waitFor(() => expect(form.submissions).toHaveLength(1));

      const posted = form.submissions[0];
      expect(posted?.get('slug')).toBe('my-real-skill');
      expect(posted?.get('destination')).toBe(
        SKILL_CREATE_DESTINATIONS.personal,
      );
      expect(posted?.get('content')).toBe(submittedContent);
    });

    test('posts the repo destination when it is selected', async () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));
      act(() => form.current.setDescription('Does a thing.'));
      act(() => form.current.setDestination(SKILL_CREATE_DESTINATIONS.repo));

      pressSaveShortcut();

      await waitFor(() => expect(form.submissions).toHaveLength(1));
      expect(form.submissions[0]?.get('destination')).toBe(
        SKILL_CREATE_DESTINATIONS.repo,
      );
    });

    test('trims the slug before posting it', async () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('  my-real-skill  '));
      act(() => form.current.setDescription('Does a thing.'));

      pressSaveShortcut();

      await waitFor(() => expect(form.submissions).toHaveLength(1));
      expect(form.submissions[0]?.get('slug')).toBe('my-real-skill');
    });

    test('ignores ⌘S while the form is invalid', async () => {
      const form = renderCreateForm();

      pressSaveShortcut();
      await act(async () => {
        await Promise.resolve();
      });

      expect(form.submissions).toHaveLength(0);
    });

    // Regression: the form submits through `useFetcher`, so the refusal lands
    // in `fetcher.data` and NEVER in the route's `actionData`. Reading
    // `actionData` swallowed every refusal silently — the author clicked
    // Create, the server refused, and nothing appeared on screen. Only a live
    // click caught it; every jsdom test passed because they fed `error` in as
    // a prop.
    test('surfaces the server refusal from the fetcher', async () => {
      const form = renderCreateForm({ error: 'Create rejected — taken.' });

      expect(form.current.error).toBeUndefined();

      act(() => form.current.setSlug('my-real-skill'));
      act(() => form.current.setDescription('Does a thing.'));
      pressSaveShortcut();

      await waitFor(() =>
        expect(form.current.error).toBe('Create rejected — taken.'),
      );
    });

    test('leaves error undefined when the action does not refuse', async () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));
      act(() => form.current.setDescription('Does a thing.'));
      pressSaveShortcut();

      await waitFor(() => expect(form.submissions).toHaveLength(1));
      expect(form.current.error).toBeUndefined();
    });

    test('ignores an unmodified s keypress', async () => {
      const form = renderCreateForm();

      act(() => form.current.setSlug('my-real-skill'));
      act(() => form.current.setDescription('Does a thing.'));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 's' }),
        );
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(form.submissions).toHaveLength(0);
    });
  });
});
