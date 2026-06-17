import * as React from 'react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../_index';

describe('routes/_index.tsx', () => {
  test('renders home build prompt heading', () => {
    const view = render(
      <TooltipProvider>
        <MemoryRouter>
          <Index
            actionData={undefined}
            loaderData={{ conversationId: null, models: [], seedMessages: [] }}
            matches={[] as never}
            params={{}}
          />
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(
      view.getByText('What would you like to build today?'),
    ).toBeInTheDocument();
  });
});
