import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { useChatComposerMentions } from '../use-chat-composer-mentions';
import type { ChatMentionProvider } from '../../types';

function assertTextArea(
  element: HTMLElement,
): asserts element is HTMLTextAreaElement {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error('Expected an HTMLTextAreaElement');
  }
}

interface HarnessProps {
  readonly disabled?: boolean;
  readonly mentionProvider?: ChatMentionProvider;
  readonly readOnly?: boolean;
}

/** Minimal textarea harness exercising the hook exactly as {@link ChatComposer} wires it. */
const MentionsHarness = (props: HarnessProps): React.ReactElement => {
  const [draft, setDraft] = React.useState('');
  const hook = useChatComposerMentions({
    disabled: props.disabled ?? false,
    draft,
    mentionProvider: props.mentionProvider,
    readOnly: props.readOnly ?? false,
    setDraft,
  });

  return (
    <div>
      <textarea
        aria-label="Message"
        onChange={hook.onChange}
        onClick={hook.onClick}
        onKeyDown={(event) => {
          hook.handleKeyDown(event);
        }}
        onKeyUp={hook.onKeyUp}
        ref={hook.setRefs}
        value={draft}
      />
      <div data-testid="mention-enabled">{String(hook.mentionEnabled)}</div>
      <div data-testid="popover-open">{String(hook.popoverOpen)}</div>
      <div data-testid="loading">{String(hook.loading)}</div>
      {hook.popoverOpen ? (
        <ul aria-label="mention results">
          {hook.results.map((path, index) => (
            <li
              aria-current={index === hook.activeIndex}
              key={path}
              onClick={() => {
                hook.selectOption(path);
              }}
            >
              {path}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const makeProvider = (paths: readonly string[]): ChatMentionProvider => ({
  onQueryFiles: vi.fn(async (query: string) =>
    paths.filter((path) => path.toLowerCase().includes(query.toLowerCase())),
  ),
});

describe('useChatComposerMentions', () => {
  const mount = (props: HarnessProps = {}): RenderResult =>
    render(<MentionsHarness {...props} />);

  test('mentionEnabled is false without a mentionProvider', () => {
    const component = mount();
    expect(component.getByTestId('mention-enabled').textContent).toBe('false');
  });

  test('mentionEnabled is false when disabled or readOnly, even with a provider', () => {
    const mentionProvider = makeProvider(['src/app.ts']);
    const disabledComponent = mount({ disabled: true, mentionProvider });
    expect(disabledComponent.getByTestId('mention-enabled').textContent).toBe(
      'false',
    );
    disabledComponent.unmount();

    const readOnlyComponent = mount({ mentionProvider, readOnly: true });
    expect(readOnlyComponent.getByTestId('mention-enabled').textContent).toBe(
      'false',
    );
  });

  test('typing @ opens the popover and queries the provider for the initial listing', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts', 'lib/util.ts']);
    const component = mount({ mentionProvider });

    await user.type(component.getByLabelText('Message'), '@');

    expect(await component.findByText('src/app.ts')).toBeInTheDocument();
    expect(mentionProvider.onQueryFiles).toHaveBeenCalledWith('');
    expect(component.getByTestId('popover-open').textContent).toBe('true');
  });

  test('typing after @ passes the query to the provider and filters results', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider([
      'src/app.ts',
      'src/app-shell.tsx',
      'lib/util.ts',
    ]);
    const component = mount({ mentionProvider });

    await user.type(component.getByLabelText('Message'), '@app');

    expect(mentionProvider.onQueryFiles).toHaveBeenLastCalledWith('app');
    expect(await component.findByText('src/app.ts')).toBeInTheDocument();
    expect(component.queryByText('lib/util.ts')).not.toBeInTheDocument();
  });

  test('does not open a popover when no provider is supplied', async () => {
    const user = userEvent.setup();
    const component = mount();

    await user.type(component.getByLabelText('Message'), '@');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
  });

  test('a rejected provider query clears loading without throwing', async () => {
    const user = userEvent.setup();
    const mentionProvider: ChatMentionProvider = {
      onQueryFiles: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const component = mount({ mentionProvider });

    await user.type(component.getByLabelText('Message'), '@x');

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(component.getByTestId('loading').textContent).toBe('false');
    expect(component.queryByRole('listitem')).toBeNull();
  });

  test('Enter inserts the active path and closes the popover', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts', 'lib/util.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, 'see @');
    await component.findByText('src/app.ts');
    await user.keyboard('{Enter}');

    expect(input.value).toBe('see @src/app.ts ');
    expect(component.getByTestId('popover-open').textContent).toBe('false');
  });

  test('ArrowDown moves the active index before Enter inserts the second result', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts', 'lib/util.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@');
    await component.findByText('lib/util.ts');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(input.value).toBe('@lib/util.ts ');
  });

  test('ArrowUp wraps back to the last result', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts', 'lib/util.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@');
    await component.findByText('lib/util.ts');
    await user.keyboard('{ArrowUp}{Enter}');

    expect(input.value).toBe('@lib/util.ts ');
  });

  test('clicking a result inserts its path', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts', 'lib/util.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@');
    await user.click(await component.findByText('lib/util.ts'));

    expect(input.value).toBe('@lib/util.ts ');
  });

  test('Escape closes the popover without inserting', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@');
    await component.findByText('src/app.ts');
    await user.keyboard('{Escape}');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
    expect(input.value).toBe('@');
  });

  test('Enter with no results dismisses the popover instead of inserting', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider([]);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@zzz');
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    await user.keyboard('{Enter}');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
    expect(input.value).toBe('@zzz');
  });

  test('Tab inserts the active result', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@');
    await component.findByText('src/app.ts');
    await user.keyboard('{Tab}');

    expect(input.value).toBe('@src/app.ts ');
  });

  test('clicking outside the mention (caret past a space) closes the popover', async () => {
    const user = userEvent.setup();
    const mentionProvider = makeProvider(['src/app.ts']);
    const component = mount({ mentionProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '@app');
    await component.findByText('src/app.ts');
    await user.type(input, ' hello');

    expect(component.getByTestId('popover-open').textContent).toBe('false');

    input.setSelectionRange(10, 10);
    fireEvent.click(input);

    expect(component.getByTestId('popover-open').textContent).toBe('false');
  });
});
