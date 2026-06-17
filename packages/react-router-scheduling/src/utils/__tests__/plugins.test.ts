import { describe, expect, it } from 'vitest';

import { createSchedulingPlugins } from '../plugins';

describe('createSchedulingPlugins', () => {
  it('creates the full v1 plugin set by default with both hook handles', () => {
    const plugins = createSchedulingPlugins();

    // events-service, calendar-controls, drag-and-drop, resize, current-time,
    // event-recurrence, event-modal
    expect(plugins.list).toHaveLength(7);
    expect(plugins.eventsService).toBeDefined();
    expect(plugins.calendarControls).toBeDefined();
    expect(typeof plugins.eventsService?.add).toBe('function');
    expect(typeof plugins.calendarControls?.setView).toBe('function');
  });

  it('omits interaction plugins when their flags are disabled', () => {
    const plugins = createSchedulingPlugins({
      currentTime: false,
      dragAndDrop: false,
      resize: false,
    });

    // events-service + calendar-controls + recurrence + event-modal (on by default)
    expect(plugins.list).toHaveLength(4);
    expect(plugins.eventsService).toBeDefined();
    expect(plugins.calendarControls).toBeDefined();
  });

  it('omits the hook handles when events-service and calendar-controls are disabled', () => {
    const plugins = createSchedulingPlugins({
      calendarControls: false,
      eventsService: false,
    });

    // drag-and-drop + resize + current-time + recurrence + event-modal only
    expect(plugins.list).toHaveLength(5);
    expect(plugins.eventsService).toBeUndefined();
    expect(plugins.calendarControls).toBeUndefined();
  });

  it('omits the recurrence plugin when its flag is disabled', () => {
    const withRecurrence = createSchedulingPlugins();
    const withoutRecurrence = createSchedulingPlugins({ recurrence: false });

    expect(withoutRecurrence.list).toHaveLength(withRecurrence.list.length - 1);
  });
});
