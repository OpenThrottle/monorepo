import type { ChatContextWindowTone } from '../utils/chat-context-window';

/**
 * Fill-bar colour per {@link ChatContextWindowTone}, from the shared theme
 * tokens. Literal classes so Tailwind keeps them.
 */
export const CHAT_CONTEXT_METER_TONE_CLASSES: Readonly<
  Record<ChatContextWindowTone, string>
> = {
  critical: 'bg-destructive',
  normal: 'bg-primary',
  warning: 'bg-chart-4',
};
