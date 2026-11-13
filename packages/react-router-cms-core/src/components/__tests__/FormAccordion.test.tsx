import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { FORM_FIELD_COPY } from '../../data/data.copy';
import { FormAccordion } from '../FormAccordion';
import { FormAccordionPane } from '../FormAccordionPane';

const renderAccordion = () => {
  return render(
    <FormAccordion className={undefined} defaultOpen="title">
      <FormAccordionPane
        className={undefined}
        errors={[]}
        label="title"
        required={true}
      >
        <p>title field</p>
      </FormAccordionPane>
      <FormAccordionPane
        className={undefined}
        errors={['must be string']}
        label="copy"
        required={false}
      >
        <p>copy field</p>
      </FormAccordionPane>
    </FormAccordion>,
  );
};

describe('FormAccordion', () => {
  test('opens the default pane and marks required panes', () => {
    const component = renderAccordion();

    expect(component.getByText('title field')).toBeVisible();
    expect(component.queryByText('copy field')).toBeNull();
    expect(component.getAllByText(FORM_FIELD_COPY.requiredMark)).toHaveLength(
      1,
    );
  });

  test('flags a pane with errors and lists them when open', async () => {
    const component = renderAccordion();
    const trigger = component.getByRole('button', { name: 'copy' });

    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(component.getByRole('button', { name: /^title/ })).toHaveAttribute(
      'aria-invalid',
      'false',
    );

    await userEvent.click(trigger);

    expect(component.getByText('must be string')).toBeVisible();
  });

  test('keeps one pane open at a time', async () => {
    const component = renderAccordion();

    await userEvent.click(component.getByRole('button', { name: 'copy' }));

    expect(component.getByText('copy field')).toBeVisible();
    expect(component.queryByText('title field')).toBeNull();
  });
});
