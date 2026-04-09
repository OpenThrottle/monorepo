import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Accordion } from '../index';
import { AccordionContent } from '../AccordionContent';
import { AccordionItem } from '../AccordionItem';
import { AccordionTrigger } from '../AccordionTrigger';

/**
 * @description Stable `value` for the sole {@link AccordionItem} in single-item fixtures.
 */
export const ACCORDION_TEST_ITEM_VALUE = 'accordion-test-item';

export interface ComposedSingleAccordionFixtureProps {
  readonly classNames?: {
    readonly content?: string;
    readonly item?: string;
    readonly trigger?: string;
  };
  /** When true, the item starts expanded (`defaultValue` on Root). When false/undefined, starts collapsed. */
  readonly defaultOpen?: boolean;
  readonly panelChildren: React.ReactNode;
  readonly triggerLabel: string;
}

/**
 * @description Minimal composed tree for Accordion tests: **Root → Item → Trigger + Content** with
 * `type="single"` and `collapsible` so Radix context exists and one section can open/close.
 *
 * ## Test matrix (what follow-on tests should cover)
 *
 * | Scenario | Setup | Assertions |
 * |----------|--------|------------|
 * | Collapsed by default | Omit `defaultOpen` | Trigger is `button` with `aria-expanded="false"`; panel copy not visible (or content hidden per Radix `hidden` / `data-state`); `data-state=closed` on item/content where Radix sets it. |
 * | Expanded initially | `defaultOpen: true` | `aria-expanded="true"`; panel text visible; `data-state=open` on relevant nodes. |
 * | Toggle open/closed | `userEvent` click on trigger | `aria-expanded` flips; panel visibility follows; optional second click restores collapsed. |
 * | Roles / a11y | Any row above | Content region semantics as Radix exposes (`role="region"`, `aria-labelledby` / ids); trigger `aria-controls` references content. |
 * | Chevron | Full tree | Chevron icon (e.g. SVG class from lucide) present next to label. |
 * | `className` merge | Pass `classNames` | Stable classes on item (`border-b`); optional `classNames.content` merges on inner wrapper of {@link AccordionContent}. |
 *
 * Use {@link renderComposedSingleAccordion} for a one-line render in specs; specialize with `classNames` or
 * slot overrides only when a test file needs them.
 */
export const ComposedSingleAccordionFixture = (
  props: ComposedSingleAccordionFixtureProps,
): React.ReactElement => {
  const { classNames, defaultOpen, panelChildren, triggerLabel } = props;

  return (
    <Accordion
      collapsible={true}
      defaultValue={
        defaultOpen === true ? ACCORDION_TEST_ITEM_VALUE : undefined
      }
      type="single"
    >
      <AccordionItem
        className={classNames?.item}
        value={ACCORDION_TEST_ITEM_VALUE}
      >
        <AccordionTrigger className={classNames?.trigger}>
          {triggerLabel}
        </AccordionTrigger>
        <AccordionContent className={classNames?.content}>
          {panelChildren}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

/**
 * @description Renders {@link ComposedSingleAccordionFixture} with Testing Library (same pattern as
 * `Tabs.test.tsx` in this package: plain `render`, no route stub).
 */
export const renderComposedSingleAccordion = (
  props: ComposedSingleAccordionFixtureProps,
): RenderResult => {
  return render(<ComposedSingleAccordionFixture {...props} />);
};
