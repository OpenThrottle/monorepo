// Deliberately module-scoped: the counter is shared by every
// `useWebsocketDebuggerLog` instance so ids stay unique across all debugger
// logs on the page, which a per-instance ref could not guarantee.
let entryIdCounter = 0;

/**
 * @description Returns the next process-unique id for a debugger log entry.
 * Hoisted out of `useWebsocketDebuggerLog` per hook-primitive-shape H3.
 */
export const createWebsocketDebuggerLogEntryId = (): string => {
  entryIdCounter += 1;
  return `ws-debug-${entryIdCounter}`;
};
