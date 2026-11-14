import { render } from '@testing-library/react';
import { BotIcon } from 'lucide-react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { UsagePageIntroduction } from '../UsagePageIntroduction';

describe('UsagePageIntroduction Component', () => {
  test('renders the title as a level-3 heading', () => {
    const component = render(
      <UsagePageIntroduction icon={BotIcon} title="Agents">
        Description
      </UsagePageIntroduction>,
    );

    expect(
      component.getByRole('heading', { level: 3, name: 'Agents' }),
    ).toBeInTheDocument();
  });

  test('renders the description below the heading', () => {
    const component = render(
      <UsagePageIntroduction icon={BotIcon} title="Agents">
        <span data-testid="Description">Description</span>
      </UsagePageIntroduction>,
    );

    expect(component.getByTestId('Description')).toBeInTheDocument();
  });
});
