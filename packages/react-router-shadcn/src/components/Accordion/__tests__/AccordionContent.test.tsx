import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderComposedSingleAccordion } from './accordion-test-utils';

const TRIGGER_LABEL = 'Accordion section';
const PANEL_TEXT = 'Panel body content';

/**
 * @description Resolves the Radix **Content** root (`role="region"`) from the trigger’s
 * `aria-controls` id.
 */
const getPanelRoot = (trigger: HTMLElement): HTMLElement | null => {
  const id = trigger.getAttribute('aria-controls');
  if (!id) {
    return null;
  }
  return document.getElementById(id);
};

describe('AccordionContent', () => {
  it('exposes the panel as a region linked to the trigger (aria-controls / aria-labelledby)', () => {
    renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const panel = getPanelRoot(trigger);

    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('data-state', 'closed');

    const labelledBy = panel?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy ?? '')).toBe(trigger);
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
  });

  it('shows children in the panel when open and hides them from view when closed', async () => {
    const user = userEvent.setup();

    renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const panel = getPanelRoot(trigger);

    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('data-state', 'closed');
    // Radix unmounts panel body when closed; text is not in the document.
    expect(screen.queryByText(PANEL_TEXT)).not.toBeInTheDocument();

    await user.click(trigger);
    expect(panel).toHaveAttribute('data-state', 'open');
    expect(screen.getByText(PANEL_TEXT)).toBeVisible();

    await user.click(trigger);
    expect(panel).toHaveAttribute('data-state', 'closed');
    expect(screen.queryByText(PANEL_TEXT)).not.toBeInTheDocument();
  });

  it('renders the panel open when the accordion defaultValue includes the item', () => {
    renderComposedSingleAccordion({
      defaultOpen: true,
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const panel = getPanelRoot(trigger);

    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('data-state', 'open');
    expect(screen.getByText(PANEL_TEXT)).toBeVisible();
  });

  it('merges className onto the inner wrapper around children', () => {
    renderComposedSingleAccordion({
      classNames: { content: 'content-custom-class' },
      defaultOpen: true,
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const panel = getPanelRoot(trigger);

    expect(panel).not.toBeNull();
    const inner = panel?.querySelector('.content-custom-class');
    expect(inner).not.toBeNull();
    expect(inner).toHaveClass('pb-4', 'pt-0');
  });
});
