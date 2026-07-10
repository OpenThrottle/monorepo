import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CalendarEvent } from '../../types';
import { toEngineEvent } from '../../utils/events';
import { buildCustomComponents } from '../slots';
import type { CalendarEventSlot, CalendarHeaderSlot } from '../slots';

const DOMAIN_EVENT: CalendarEvent = {
  end: '2026-06-15T11:00:00.000Z',
  id: 'evt-x',
  start: '2026-06-15T10:00:00.000Z',
  title: 'Standup',
};

describe('buildCustomComponents', () => {
  it('returns undefined when no slots (or only empty) are provided', () => {
    expect(buildCustomComponents(undefined)).toBeUndefined();
    expect(buildCustomComponents({})).toBeUndefined();
  });

  it('only maps the slots that were provided', () => {
    const Renderer: CalendarEventSlot = () => <div>card</div>;
    const result = buildCustomComponents({ timeGridEvent: Renderer });

    expect(result).toBeDefined();
    expect(Object.keys(result ?? {})).toEqual(['timeGridEvent']);
  });

  it('hands an event slot a domain CalendarEvent adapted from the engine event', () => {
    let received: CalendarEvent | undefined;
    // eslint-disable-next-line react/no-multi-comp -- test-local slot renderer component
    const Renderer: CalendarEventSlot = ({ calendarEvent }) => {
      received = calendarEvent;
      return <div>{calendarEvent.title}</div>;
    };

    const result = buildCustomComponents({ eventModal: Renderer });
    const Wrapper = result?.eventModal;
    expect(Wrapper).toBeDefined();
    if (Wrapper === undefined) return;

    const component = render(
      <Wrapper calendarEvent={toEngineEvent(DOMAIN_EVENT)} />,
    );

    expect(received?.id).toBe('evt-x');
    expect(received?.title).toBe('Standup');
    // Engine Temporal datetime is adapted back to an ISO string (same instant).
    expect(new Date(received?.start ?? '').getTime()).toBe(
      new Date(DOMAIN_EVENT.start).getTime(),
    );
    expect(component.container.textContent).toContain('Standup');
  });

  it('renders a header slot as free content (no event forwarded)', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local slot renderer component
    const Header: CalendarHeaderSlot = () => <div>Brand</div>;
    const result = buildCustomComponents({ headerContent: Header });
    const Wrapper = result?.headerContent;
    expect(Wrapper).toBeDefined();
    if (Wrapper === undefined) return;

    const component = render(
      <Wrapper calendarEvent={toEngineEvent(DOMAIN_EVENT)} />,
    );
    expect(component.container.textContent).toContain('Brand');
  });
});
