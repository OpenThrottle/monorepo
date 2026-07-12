import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { SkillTagVocabularyManager } from '../SkillTagVocabularyManager';
import type { SkillTagVocabularyManagerProps } from '../SkillTagVocabularyManager';

const renderManager = (
  props: SkillTagVocabularyManagerProps,
): {
  calls: { count: number; lastTag: string | null };
  component: RenderResult;
} => {
  const calls: { count: number; lastTag: string | null } = {
    count: 0,
    lastTag: null,
  };
  const Stub = createRoutesStub([
    {
      Component: () => (
        <TooltipProvider>
          <SkillTagVocabularyManager {...props} />
        </TooltipProvider>
      ),
      action: async ({ request }) => {
        const fd = await request.formData();
        const tag = fd.get('tag');
        calls.count += 1;
        calls.lastTag = typeof tag === 'string' ? tag : null;
        return { ok: true };
      },
      path: '/skills/availability',
    },
  ]);
  const component = render(<Stub initialEntries={['/skills/availability']} />);
  return { calls, component };
};

describe('SkillTagVocabularyManager Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the honest rename/remove caveat and the tag rows', () => {
    const { component } = renderManager({
      tags: [
        { id: 't1', tag: 'github' },
        { id: 't2', tag: 'terraform' },
      ],
    });

    expect(
      component.getByTestId('SkillTagVocabularyManager'),
    ).toBeInTheDocument();
    expect(
      component.getByText(/does NOT rewrite skill frontmatter/i),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SkillTagVocabularyRow-github'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SkillTagVocabularyRow-terraform'),
    ).toBeInTheDocument();
  });

  test('rejects a non-kebab-case new tag client-side without submitting', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderManager({ tags: [] });

    await user.type(component.getByLabelText(/Add tag/i), 'Not Kebab');
    await user.click(component.getByRole('button', { name: /^Add tag$/i }));

    expect(component.getByText(/must be kebab-case/i)).toBeInTheDocument();
    expect(calls.count).toBe(0);
  });

  test('submits addTag for a valid kebab-case tag', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderManager({ tags: [] });

    await user.type(component.getByLabelText(/Add tag/i), 'pr-review');
    await user.click(component.getByRole('button', { name: /^Add tag$/i }));

    await waitFor(() => {
      expect(calls.count).toBe(1);
    });
    expect(calls.lastTag).toBe('pr-review');
  });
});
