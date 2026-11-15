import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderComposedSingleAccordion } from './accordion-test-utils';

const TRIGGER_LABEL = 'Accordion section';
const PANEL_TEXT = 'Panel body content';

describe('AccordionTrigger', () => {
  it('renders a button with the label, chevron icon, and collapsed state by default', () => {
    const component = renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = component.getByRole('button', { name: TRIGGER_LABEL });

    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.querySelector('svg')).toBeInTheDocument();

    // Collapsed, Radix exposes no `aria-controls` on the trigger; the panel is
    // still in the DOM and is linked back to the trigger via `aria-labelledby`.
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    const panel = document.querySelector(
      `[role="region"][aria-labelledby="${trigger.id}"]`,
    );
    expect(panel).toBeInTheDocument();
  });

  it('starts expanded when the accordion defaultValue includes the item', () => {
    const component = renderComposedSingleAccordion({
      defaultOpen: true,
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = component.getByRole('button', { name: TRIGGER_LABEL });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(component.getByText(PANEL_TEXT)).toBeVisible();
  });

  it('toggles aria-expanded and panel visibility when clicked', async () => {
    const user = userEvent.setup();

    const component = renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = component.getByRole('button', { name: TRIGGER_LABEL });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(component.getByText(PANEL_TEXT)).toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(component.queryByText(PANEL_TEXT)).not.toBeInTheDocument();
  });

  it('merges className onto the trigger button', () => {
    const component = renderComposedSingleAccordion({
      classNames: { trigger: 'trigger-custom-class' },
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    expect(component.getByRole('button', { name: TRIGGER_LABEL })).toHaveClass(
      'trigger-custom-class',
    );
  });
});
