import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { ChatSessionDrawerSection } from '../ChatSessionDrawerSection';

const renderSection = (isCollapsed: boolean) => {
  const onToggle = vi.fn();
  const component = render(
    <ChatSessionDrawerSection
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      sectionId="running"
      title="Running"
    >
      <p data-testid="body">body</p>
    </ChatSessionDrawerSection>,
  );

  return { component, onToggle };
};

describe('ChatSessionDrawerSection', () => {
  describe('when expanded', () => {
    test('shows its body', () => {
      const { component } = renderSection(false);

      expect(component.getByTestId('body')).toBeInTheDocument();
    });
  });

  describe('when collapsed', () => {
    test('hides its body but keeps the toggle', () => {
      const { component } = renderSection(true);

      expect(component.queryByTestId('body')).toBeNull();
      expect(
        component.getByTestId('ChatSessionDrawerSection-running-toggle'),
      ).toBeInTheDocument();
    });
  });

  test('clicking the title row reports a toggle', async () => {
    const { component, onToggle } = renderSection(false);

    await userEvent.click(
      component.getByTestId('ChatSessionDrawerSection-running-toggle'),
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
