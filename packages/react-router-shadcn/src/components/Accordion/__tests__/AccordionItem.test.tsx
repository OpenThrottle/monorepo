import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderComposedSingleAccordion } from './accordion-test-utils';

const TRIGGER_LABEL = 'Accordion section';
const PANEL_TEXT = 'Panel body content';

/**
 * @description Radix nests **Trigger → Header (`h3`) → Item root** (Collapsible root with
 * `data-state`, `border-b`, etc.). Resolves the item wrapper for assertions on the item component.
 */
const getAccordionItemRoot = (trigger: HTMLElement): HTMLElement | null =>
  trigger.parentElement?.parentElement ?? null;

describe('AccordionItem', () => {
  it('renders the item wrapper with border-b and closed data-state by default', () => {
    renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const item = getAccordionItemRoot(trigger);

    expect(item).not.toBeNull();
    expect(item).toHaveAttribute('data-state', 'closed');
    expect(item).toHaveClass('border-b');
  });

  it('sets data-state to open when the section is expanded by default', () => {
    renderComposedSingleAccordion({
      defaultOpen: true,
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const item = getAccordionItemRoot(trigger);

    expect(item).not.toBeNull();
    expect(item).toHaveAttribute('data-state', 'open');
  });

  it('toggles data-state on the item when the trigger is clicked', async () => {
    const user = userEvent.setup();

    renderComposedSingleAccordion({
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const item = getAccordionItemRoot(trigger);

    expect(item).not.toBeNull();
    expect(item).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);
    expect(item).toHaveAttribute('data-state', 'open');

    await user.click(trigger);
    expect(item).toHaveAttribute('data-state', 'closed');
  });

  it('merges className onto the item wrapper', () => {
    renderComposedSingleAccordion({
      classNames: { item: 'item-custom-class' },
      panelChildren: PANEL_TEXT,
      triggerLabel: TRIGGER_LABEL,
    });

    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    const item = getAccordionItemRoot(trigger);

    expect(item).not.toBeNull();
    expect(item).toHaveClass('item-custom-class');
    expect(item).toHaveClass('border-b');
  });
});
