import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';
import type { OutputStreamAttemptGroup } from '~/routing/plans/utils/output-stream-attempts';

import type { OutputStreamAttemptProps } from '../OutputStreamAttempt';
import { OutputStreamAttempt } from '../OutputStreamAttempt';

const attempt: OutputStreamAttemptGroup = {
  chunks: [
    {
      content: '→ Read src/a.ts',
      createdAt: new Date(2026, 10, 11, 10, 0, 0),
      id: 'c1',
      iteration: 1,
      kind: 'tool',
      taskId: 't1',
    },
    {
      content: 'Fixed the parser.',
      createdAt: new Date(2026, 10, 11, 10, 1, 17),
      id: 'c2',
      iteration: 1,
      kind: 'worker',
      taskId: 't1',
    },
    {
      content: 'start\nlint ✗ exit 1 · 54s',
      createdAt: new Date(2026, 10, 11, 10, 2, 0),
      id: 'c3',
      iteration: 1,
      kind: 'validation',
      taskId: 't1',
    },
    {
      content: '[ot-loop] attempt 1 failed: lint exited 1; retrying',
      createdAt: new Date(2026, 10, 11, 10, 2, 0),
      id: 'c4',
      iteration: 1,
      kind: 'loop',
      taskId: 't1',
    },
  ],
  iteration: 1,
  taskId: 't1',
};

describe('OutputStreamAttempt Component', () => {
  let component: RenderResult;
  let props: OutputStreamAttemptProps;

  beforeEach(() => {
    props = { attempt };
    component = render(<OutputStreamAttempt {...props} />);
  });

  test('shows the summary header', () => {
    expect(
      component.getByTestId('OutputStreamAttempt-header'),
    ).toHaveTextContent('Attempt 1 · worker 1m 17s · validation: lint ✗');
  });

  test('previews the closing summary and loop lines in time order but hides the full attempt', () => {
    const preview = component.getAllByTestId('OutputStreamAttempt-preview');

    expect(preview.map((line) => line.textContent)).toEqual([
      'Fixed the parser.',
      '[ot-loop] attempt 1 failed: lint exited 1; retrying',
    ]);
    expect(component.queryByText('→ Read src/a.ts')).not.toBeInTheDocument();
    expect(component.queryByText(/exit 1 · 54s/)).not.toBeInTheDocument();
  });

  test('reveals tool lines and validation logs when the disclosure is opened', async () => {
    await userEvent.click(
      component.getByText(OUTPUT_STREAM_COPY.attemptDetailsShow),
    );

    expect(component.getByText('→ Read src/a.ts')).toBeInTheDocument();
    expect(component.getByText(/exit 1 · 54s/)).toBeInTheDocument();
    expect(
      component.getByText(OUTPUT_STREAM_COPY.attemptDetailsHide),
    ).toBeInTheDocument();
    expect(
      component.queryAllByTestId('OutputStreamAttempt-preview'),
    ).toHaveLength(0);
  });
});
