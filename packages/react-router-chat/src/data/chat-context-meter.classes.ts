import type { ChatContextWindowTonesValue } from '../utils/chat-context-window';

/**
 * Fill-bar colour per {@link ChatContextWindowTonesValue}, from the shared theme
 * tokens. Literal classes so Tailwind keeps them.
 * @public
 */
export const CHAT_CONTEXT_METER_TONE_CLASSES: Readonly<
  Record<ChatContextWindowTonesValue, string>
> = {
  critical: 'bg-destructive',
  normal: 'bg-primary',
  warning: 'bg-chart-4',
};
