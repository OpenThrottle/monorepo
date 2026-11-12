import type { CmsComponentDebug } from '@openthrottle/react-router-cms-ui';
import { cn } from '@openthrottle/react-router-shadcn';

/**
 * @description A CMS component as the preview sees it: anything carrying the
 * static `debug` metadata every cms-ui block exports.
 */
interface DebuggableComponent {
  readonly debug: CmsComponentDebug;
}

/**
 * @description Merges a block's `debug.className` onto the class names it is
 * rendered with, but only while debug mode is on.
 */
export const debugClassName = (
  component: DebuggableComponent,
  isDebug: boolean,
  className: string | undefined,
): string => {
  const debug = isDebug ? component.debug.className : undefined;

  return cn(className, debug);
};
