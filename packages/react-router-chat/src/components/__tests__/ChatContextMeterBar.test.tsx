import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatContextMeterBar } from '../ChatContextMeterBar';

describe('ChatContextMeterBar Component', () => {
  test('sizes the fill to the percent', () => {
    const component = render(
      <ChatContextMeterBar
        fill={{
          percent: 42,
          tone: 'normal',
          usedTokens: 84,
          windowTokens: 200,
        }}
      />,
    );

    expect(component.getByTestId('ChatContextMeterBar-fill')).toHaveStyle({
      width: '42%',
    });
  });

  test.each(['normal', 'warning', 'critical'] as const)(
    'reports the %s tone',
    (tone) => {
      const component = render(
        <ChatContextMeterBar
          fill={{ percent: 10, tone, usedTokens: 1, windowTokens: 10 }}
        />,
      );

      expect(component.getByTestId('ChatContextMeterBar-fill')).toHaveAttribute(
        'data-tone',
        tone,
      );
    },
  );

  test('is decorative and takes the caller sizing class last', () => {
    const component = render(
      <ChatContextMeterBar
        className="w-10"
        fill={{ percent: 5, tone: 'normal', usedTokens: 1, windowTokens: 20 }}
      />,
    );

    const bar = component.getByTestId('ChatContextMeterBar');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveClass('w-10');
  });
});
