import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { useChatComposerSlashCommands } from '../use-chat-composer-slash-commands';
import type { ChatSlashCommand, ChatSlashCommandProvider } from '../../types';

function assertTextArea(
  element: HTMLElement,
): asserts element is HTMLTextAreaElement {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error('Expected an HTMLTextAreaElement');
  }
}

interface HarnessProps {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly slashCommandProvider?: ChatSlashCommandProvider;
}

/** Minimal textarea harness exercising the hook exactly as {@link ChatComposer} wires it. */
const SlashCommandsHarness = (props: HarnessProps): React.ReactElement => {
  const [draft, setDraft] = React.useState('');
  const hook = useChatComposerSlashCommands({
    disabled: props.disabled ?? false,
    draft,
    readOnly: props.readOnly ?? false,
    setDraft,
    slashCommandProvider: props.slashCommandProvider,
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
      <div data-testid="slash-enabled">{String(hook.slashEnabled)}</div>
      <div data-testid="popover-open">{String(hook.popoverOpen)}</div>
      <div data-testid="loading">{String(hook.loading)}</div>
      {hook.popoverOpen ? (
        <ul aria-label="skill results">
          {hook.results.map((skill, index) => (
            <li
              aria-current={index === hook.activeIndex}
              key={skill.slug}
              onClick={() => {
                hook.selectOption(skill.slug);
              }}
            >
              {`/${skill.slug}`}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const graphify: ChatSlashCommand = {
  description: 'Build a graph',
  slug: 'graphify',
};
const improve: ChatSlashCommand = {
  description: 'Audit the codebase',
  slug: 'improve',
};

const makeProvider = (
  skills: readonly ChatSlashCommand[],
): ChatSlashCommandProvider => ({
  onQuerySkills: vi.fn(async (query: string) =>
    skills.filter(
      (skill) =>
        skill.slug.toLowerCase().includes(query.toLowerCase()) ||
        skill.description.toLowerCase().includes(query.toLowerCase()),
    ),
  ),
});

describe('useChatComposerSlashCommands', () => {
  const mount = (props: HarnessProps = {}): RenderResult =>
    render(<SlashCommandsHarness {...props} />);

  test('slashEnabled is false without a slashCommandProvider', () => {
    const component = mount();
    expect(component.getByTestId('slash-enabled').textContent).toBe('false');
  });

  test('slashEnabled is false when disabled or readOnly, even with a provider', () => {
    const slashCommandProvider = makeProvider([graphify]);
    const disabledComponent = mount({ disabled: true, slashCommandProvider });
    expect(disabledComponent.getByTestId('slash-enabled').textContent).toBe(
      'false',
    );
    disabledComponent.unmount();

    const readOnlyComponent = mount({ readOnly: true, slashCommandProvider });
    expect(readOnlyComponent.getByTestId('slash-enabled').textContent).toBe(
      'false',
    );
  });

  test('typing / opens the popover and queries the provider for the initial listing', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify, improve]);
    const component = mount({ slashCommandProvider });

    await user.type(component.getByLabelText('Message'), '/');

    expect(await component.findByText('/graphify')).toBeInTheDocument();
    expect(slashCommandProvider.onQuerySkills).toHaveBeenCalledWith('');
    expect(component.getByTestId('popover-open').textContent).toBe('true');
  });

  test('typing after / passes the query to the provider and filters results', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify, improve]);
    const component = mount({ slashCommandProvider });

    await user.type(component.getByLabelText('Message'), '/gra');

    expect(slashCommandProvider.onQuerySkills).toHaveBeenLastCalledWith('gra');
    expect(await component.findByText('/graphify')).toBeInTheDocument();
    expect(component.queryByText('/improve')).not.toBeInTheDocument();
  });

  test('does not trigger for a mid-line / after text (start-of-line rule)', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify]);
    const component = mount({ slashCommandProvider });

    await user.type(component.getByLabelText('Message'), 'hi /gra');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
  });

  test('a rejected provider query clears loading without throwing', async () => {
    const user = userEvent.setup();
    const slashCommandProvider: ChatSlashCommandProvider = {
      onQuerySkills: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const component = mount({ slashCommandProvider });

    await user.type(component.getByLabelText('Message'), '/x');

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(component.getByTestId('loading').textContent).toBe('false');
    expect(component.queryByRole('listitem')).toBeNull();
  });

  test('Enter inserts the active /slug and closes the popover', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify, improve]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/');
    await component.findByText('/graphify');
    await user.keyboard('{Enter}');

    expect(input.value).toBe('/graphify ');
    expect(component.getByTestId('popover-open').textContent).toBe('false');
  });

  test('ArrowDown moves the active index before Enter inserts the second skill', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify, improve]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/');
    await component.findByText('/improve');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(input.value).toBe('/improve ');
  });

  test('ArrowUp wraps back to the last skill', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify, improve]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/');
    await component.findByText('/improve');
    await user.keyboard('{ArrowUp}{Enter}');

    expect(input.value).toBe('/improve ');
  });

  test('Tab commits the active skill', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/');
    await component.findByText('/graphify');
    await user.keyboard('{Tab}');

    expect(input.value).toBe('/graphify ');
  });

  test('clicking a skill inserts its slug', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify, improve]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/');
    await user.click(await component.findByText('/improve'));

    expect(input.value).toBe('/improve ');
  });

  test('Escape closes the popover without inserting', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/');
    await component.findByText('/graphify');
    await user.keyboard('{Escape}');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
    expect(input.value).toBe('/');
  });

  test('Enter with no results dismisses the popover instead of inserting', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/zzz');
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    await user.keyboard('{Enter}');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
    expect(input.value).toBe('/zzz');
  });

  test('typing a space after the slug closes the popover (arguments, not a query)', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/gra');
    await component.findByText('/graphify');

    await user.type(input, ' hello');

    expect(component.getByTestId('popover-open').textContent).toBe('false');
  });

  test('clicking back into the slug re-opens the popover for the same query', async () => {
    const user = userEvent.setup();
    const slashCommandProvider = makeProvider([graphify]);
    const component = mount({ slashCommandProvider });
    const input = component.getByLabelText('Message');
    assertTextArea(input);

    await user.type(input, '/gra hello');
    expect(component.getByTestId('popover-open').textContent).toBe('false');

    input.setSelectionRange(4, 4);
    fireEvent.click(input);

    expect(await component.findByText('/graphify')).toBeInTheDocument();
  });
});
