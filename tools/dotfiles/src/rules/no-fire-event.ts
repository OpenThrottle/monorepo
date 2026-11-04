import { createAntiFlakeRule } from './anti-flake-shared.ts';

/**
 * The no-fire-event rule: simulate interactions with `userEvent`, not
 * `fireEvent` (docs/monorepo/code-style.md, "Testing"). `fireEvent` dispatches
 * one synthetic event; `userEvent` drives the full sequence a user produces
 * (pointer down/up, focus, key events), so a test passing under `fireEvent`
 * can still fail in a browser.
 *
 * Reported once per file, on the import, so the burn-down count is files.
 * The few interactions `userEvent` cannot drive — drag-and-drop with a
 * `dataTransfer`, `<input type="color">` change — take an inline disable with
 * the reason.
 */

type MessageIds = 'fireEvent';

export const noFireEvent = createAntiFlakeRule<[], MessageIds>({
  create(context) {
    return {
      ImportDeclaration(node): void {
        if (!node.source.value.startsWith('@testing-library/')) return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'fireEvent'
          ) {
            context.report({ messageId: 'fireEvent', node: specifier });
          }
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: 'Disallow fireEvent in tests; use userEvent.',
    },
    messages: {
      fireEvent:
        'Use `userEvent` (`@testing-library/user-event`), not `fireEvent`. Under fake timers, `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. Drag-and-drop with `dataTransfer` and `<input type="color">` may keep `fireEvent` behind an inline disable with the reason.',
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'no-fire-event',
});
