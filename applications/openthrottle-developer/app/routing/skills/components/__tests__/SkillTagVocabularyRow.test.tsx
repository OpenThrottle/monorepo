import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import {
  Table,
  TableBody,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import { SkillTagVocabularyRow } from '../SkillTagVocabularyRow';
import type { SkillTagVocabularyRowProps } from '../SkillTagVocabularyRow';

const renderRow = (
  props: SkillTagVocabularyRowProps,
): { calls: { count: number }; component: RenderResult } => {
  const calls = { count: 0 };
  const Stub = createRoutesStub([
    {
      Component: () => (
        <TooltipProvider>
          <Table>
            <TableBody>
              <SkillTagVocabularyRow {...props} />
            </TableBody>
          </Table>
        </TooltipProvider>
      ),
      action: async ({ request }) => {
        await request.formData();
        calls.count += 1;
        return { ok: true };
      },
      path: '/skills/availability',
    },
  ]);
  const component = render(<Stub initialEntries={['/skills/availability']} />);
  return { calls, component };
};

describe('SkillTagVocabularyRow Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders a rename field seeded with the tag and a remove control', () => {
    const { component } = renderRow({ tag: { id: 't1', tag: 'github' } });

    expect(
      component.getByTestId('SkillTagVocabularyRow-github'),
    ).toBeInTheDocument();
    expect(component.getByLabelText('Rename github')).toHaveValue('github');
    expect(
      component.getByRole('button', { name: 'Remove github' }),
    ).toBeInTheDocument();
  });

  test('rejects a non-kebab-case rename client-side without submitting', async () => {
    const user = userEvent.setup();
    const { calls, component } = renderRow({
      tag: { id: 't1', tag: 'github' },
    });

    const input = component.getByLabelText('Rename github');
    await user.clear(input);
    await user.type(input, 'Bad Name');
    await user.click(component.getByRole('button', { name: /^Rename$/i }));

    expect(component.getByText(/must be kebab-case/i)).toBeInTheDocument();
    expect(calls.count).toBe(0);
  });
});
