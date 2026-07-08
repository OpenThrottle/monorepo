import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import RoleDetailComponent from '../roles.$roleId';

const role = {
  __typename: 'RoleObject' as const,
  createdAt: new Date('2025-01-01'),
  description: 'Administrator',
  id: 'role-1',
  name: 'admin',
  permissions: [],
  updatedAt: new Date('2025-01-02'),
};

type ActionData = { ok: true } | { error: string } | undefined;

// Stable harness: keeps the route component mounted across an actionData change
// so the sheet-close-on-success effect (which keys off props.actionData.ok) is
// exercised on a real prop transition rather than a remount. A button flips
// actionData to a successful result. useFetcher needs a data-router context,
// hence the surrounding stub.
const Harness = () => {
  const [actionData, setActionData] = React.useState<ActionData>(undefined);

  return (
    <div>
      <button onClick={() => setActionData({ ok: true })} type="button">
        simulate-success
      </button>
      <RoleDetailComponent
        actionData={actionData}
        loaderData={{ permissions: [], role }}
        matches={[]}
        params={{ roleId: 'role-1' }}
      />
    </div>
  );
};

const renderHarness = () => {
  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('routes/roles.$roleId.tsx edit sheet', () => {
  test('opens the edit sheet when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const component = renderHarness();

    await user.click(component.getByRole('button', { name: 'Edit role' }));

    expect(
      await component.findByRole('textbox', { name: 'Name' }),
    ).toBeInTheDocument();
  });

  test('closes the edit sheet once actionData reports success', async () => {
    const user = userEvent.setup();
    const component = renderHarness();

    // Capture the trigger before opening the sheet: Radix marks sibling content
    // aria-hidden while the modal sheet is open, so a role query would miss it.
    const successButton = component.getByRole('button', {
      name: 'simulate-success',
    });

    await user.click(component.getByRole('button', { name: 'Edit role' }));
    expect(
      await component.findByRole('textbox', { name: 'Name' }),
    ).toBeInTheDocument();

    // This synthetic harness control stands in for the route action result. The
    // open modal sheet sets pointer-events:none on the rest of the page, so the
    // pointer-events guard is disabled for this stand-in click only.
    const harnessUser = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    await harnessUser.click(successButton);

    await waitFor(() => {
      expect(
        component.queryByRole('textbox', { name: 'Name' }),
      ).not.toBeInTheDocument();
    });
  });
});
