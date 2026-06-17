// Installs globalThis.Temporal before the Schedule-X calendar renders.
import './Calendar.css';
import '../utils/temporal-bootstrap';
import '@schedule-x/theme-shadcn/dist/index.css';

import * as React from 'react';
import classnames from 'classnames';
import { ScheduleXCalendar } from '@schedule-x/react';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { buildCustomComponents } from './slots';
import { isHostDark } from '../utils/dark-mode';
import type { CSSProperties, ReactElement } from 'react';
import type { CalendarSlots } from './slots';
import type { UseScheduleResult } from '../hooks/useSchedule';

export interface CalendarProps {
  /** Class applied to the calendar wrapper element. */
  readonly className?: string;
  /** Wrapper height as a CSS length (default `100%`; the parent must be sized). */
  readonly height?: string;
  /** The schedule to render (its `instance` is the Schedule-X app). */
  readonly schedule: UseScheduleResult;
  /** Custom render slots (e.g. a custom event card per view). */
  readonly slots?: CalendarSlots;
  /** Extra inline styles merged after the sizing. */
  readonly style?: CSSProperties;
  /** Wrapper width as a CSS length (default `100%`). */
  readonly width?: string;
}

/**
 * Primitive view component: renders a {@link UseScheduleResult} in a
 * Schedule-X calendar with the official shadcn theme (`@schedule-x/theme-shadcn`)
 * and the explicit sizing Schedule-X requires; the calendar tracks the host
 * app's light/dark mode. Pair with `useCalendar` (or use `CalendarLayout`) for
 * view/navigation controls.
 *
 * @publicApi
 */
export function Calendar(props: CalendarProps): ReactElement | null {
  const {
    className,
    height = '100%',
    schedule,
    slots,
    style,
    width = '100%',
  } = props;

  // Hooks
  // Keep Schedule-X's light/dark in sync with the host app: `.dark` on the
  // document element (or the OS preference) toggles the engine's theme.
  React.useEffect(() => {
    const { instance } = schedule;
    const sync = (): void => {
      instance.setTheme(isHostDark() ? 'dark' : 'light');
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', sync);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, [schedule]);

  // Setup
  const wrapperStyle: CSSProperties = { height, width, ...style };
  const customComponents = buildCustomComponents(slots);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!IS_BROWSER) {
    return null;
  }

  return (
    <div className={classnames('h-full', className)} style={wrapperStyle}>
      <ScheduleXCalendar
        calendarApp={schedule.instance}
        customComponents={customComponents}
      />
    </div>
  );
}
