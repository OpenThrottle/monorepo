import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import {
  CRON_EXPRESSION_COPY,
  CRON_PRESETS,
} from '../../data/data.cron-presets';
import { InputCronExpression } from '../InputCronExpression';
import type { InputCronExpressionProps } from '../InputCronExpression';

const renderInput = (props: InputCronExpressionProps = {}): RenderResult => {
  const Component = () => <InputCronExpression {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('InputCronExpression Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the control shell', () => {
    const component = renderInput();

    expect(component.getByTestId('InputCronExpression')).toBeInTheDocument();
  });

  test('describes a valid expression in English', () => {
    const component = renderInput({ defaultValue: '0 9 * * *' });

    expect(component.getByText(/at 09:00/i)).toBeInTheDocument();
    expect(
      component.queryByText(CRON_EXPRESSION_COPY.invalid),
    ).not.toBeInTheDocument();
  });

  test('shows the invalid copy for an unparseable expression', () => {
    const component = renderInput({ defaultValue: 'not a cron' });

    expect(
      component.getByText(CRON_EXPRESSION_COPY.invalid),
    ).toBeInTheDocument();
  });

  test('shows the hint rather than an error when empty', () => {
    const component = renderInput();

    expect(
      component.getByText(CRON_EXPRESSION_COPY.emptyHint),
    ).toBeInTheDocument();
    expect(
      component.queryByText(CRON_EXPRESSION_COPY.invalid),
    ).not.toBeInTheDocument();
  });

  test('updates the description as the user types', async () => {
    const user = userEvent.setup();
    const component = renderInput();

    await user.type(component.getByRole('textbox'), '0 9 * * *');

    expect(component.getByText(/at 09:00/i)).toBeInTheDocument();
  });

  test('fills the input from a preset and fires onChange', async () => {
    const user = userEvent.setup();
    const changes: string[] = [];
    const preset = CRON_PRESETS[0];
    const component = renderInput({
      onChange: (event) => changes.push(event.target.value),
    });

    await user.click(
      component.getByRole('button', {
        name: CRON_EXPRESSION_COPY.presetsTrigger,
      }),
    );
    await user.click(component.getByRole('menuitem', { name: preset.label }));

    expect(component.getByRole('textbox')).toHaveValue(preset.value);
    expect(changes).toContain(preset.value);
  });

  test('passes id, name, defaultValue, and required through to the input', () => {
    const component = renderInput({
      defaultValue: '0 9 * * *',
      id: 'cronPattern',
      name: 'cronPattern',
      required: true,
    });

    const input = component.getByRole('textbox');

    expect(input).toHaveAttribute('id', 'cronPattern');
    expect(input).toHaveAttribute('name', 'cronPattern');
    expect(input).toBeRequired();
    expect(input).toHaveValue('0 9 * * *');
  });

  test('points aria-describedby at the description node', () => {
    const component = renderInput({ defaultValue: '0 9 * * *' });

    const input = component.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby') ?? '';

    expect(describedBy).not.toHaveLength(0);
    expect(
      component.container.querySelector(`#${describedBy}`),
    ).toHaveTextContent(/at 09:00/i);
  });

  test('describes a controlled value', () => {
    const component = renderInput({
      onChange: () => undefined,
      value: '0 9 * * 1-5',
    });

    expect(component.getByRole('textbox')).toHaveValue('0 9 * * 1-5');
    expect(
      component.queryByText(CRON_EXPRESSION_COPY.invalid),
    ).not.toBeInTheDocument();
  });
});
