/**
 * Neutral hover for the chat side panels (the session drawer, the conversations
 * sidebar and their rails): half-strength `muted`, not the brand-coloured `accent`
 * the shadcn ghost variant uses, so the panels stay quiet in light and dark. Also
 * overrides the variant's dark-mode `accent/50`.
 * @public
 */
export const CHAT_PANEL_HOVER_CLASSES = `hover:bg-muted/50 hover:text-foreground dark:hover:bg-muted/50`;

/** A selected row in a chat side panel: the same neutral tone, a step firmer. @public */
export const CHAT_PANEL_SELECTED_CLASSES = 'bg-muted/70';
