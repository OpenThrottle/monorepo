import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderComposedSingleAccordion } from './accordion-test-utils';

const TRIGGER_LABEL = 'Accordion section';
const PANEL_TEXT = 'Panel body content';

describe('AccordionTrigger', () => {
  it('renders a button with the label, chevron icon, and collapsed state by default', () => {
    renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });

    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.querySelector('svg')).toBeInTheDocument();

    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId ?? '')).toBeInTheDocument();
  });

  it('starts expanded when the accordion defaultValue includes the item', () => {
    renderComposedSingleAccordion({
      defaultOpen: true,
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(PANEL_TEXT)).toBeVisible();
  });

  it('toggles aria-expanded and panel visibility when clicked', async () => {
    const user = userEvent.setup();

    renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(PANEL_TEXT)).toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(PANEL_TEXT)).not.toBeInTheDocument();
  });

  it('merges className onto the trigger button', () => {
    renderComposedSingleAccordion({
      classNames: { trigger: 'trigger-custom-class' },
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    expect(screen.getByRole('button', { name: TRIGGER_LABEL })).toHaveClass(
      'trigger-custom-class',
    );
  });
});
