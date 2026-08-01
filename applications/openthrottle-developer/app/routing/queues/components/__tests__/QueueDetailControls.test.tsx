import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { QueueDetailControls } from '../QueueDetailControls';
import type { QueueDetailControlsProps } from '../QueueDetailControls';

const renderControls = (props: QueueDetailControlsProps): RenderResult => {
  const Component = () => <QueueDetailControls {...props} />;
  const RoutesStub = createRoutesStub([
    { Component, action: () => ({}), path: '/' },
  ]);
  return render(<RoutesStub />);
};

describe('QueueDetailControls Component', () => {
  test('renders pause, resume and clean controls', () => {
    const component = renderControls({ queueName: 'plans' });

    expect(component.getByTestId('QueueDetailControls')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /Pause/ }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /Resume/ }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /Clean/ }),
    ).toBeInTheDocument();
  });

  test('the clean dialog offers completed and failed removal behind a confirm', async () => {
    const user = userEvent.setup();
    const component = renderControls({ queueName: 'plans' });

    await user.click(component.getByRole('button', { name: /Clean/ }));

    expect(await component.findByRole('alertdialog')).toHaveTextContent(
      /Only completed or failed jobs are removed/i,
    );
    expect(
      component.getByRole('button', { name: 'Remove completed' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Remove failed' }),
    ).toBeInTheDocument();
  });
});
