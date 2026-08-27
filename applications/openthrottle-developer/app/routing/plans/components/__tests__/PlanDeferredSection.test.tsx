import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { PlanDeferredSection } from '../PlanDeferredSection';

interface HarnessProps {
  initial: Promise<string>;
}

/**
 * One deferred region plus a button that swaps in a never-settling replacement
 * promise — which is exactly what a route revalidation does to a deferred
 * loader key, without unmounting the region.
 */
const Harness = (props: HarnessProps): React.ReactElement => {
  const { initial } = props;

  // Hooks
  const [value, setValue] = React.useState<Promise<string>>(() => initial);

  // Setup

  // Handlers
  const onRevalidate = () => setValue(new Promise<string>(() => {}));

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <button onClick={onRevalidate} type="button">
        revalidate
      </button>

      <PlanDeferredSection
        errorText="Could not load this region."
        fallback={<p>Loading region…</p>}
        resolve={value}
      >
        {(data) => <p>{data}</p>}
      </PlanDeferredSection>
    </>
  );
};

// `Await` is a Suspense wrapper, not a data hook, so the region needs no router
// context — rendering Harness directly keeps this file to a single component.
function renderRegion(initial: Promise<string>): RenderResult {
  return render(<Harness initial={initial} />);
}

describe('PlanDeferredSection Component', () => {
  test('should render the fallback while the first promise is pending', () => {
    const component = renderRegion(new Promise<string>(() => {}));

    expect(component.getByText('Loading region…')).toBeInTheDocument();
  });

  test('should render the resolved content', async () => {
    const component = renderRegion(Promise.resolve('first value'));

    await waitFor(() =>
      expect(component.getByText('first value')).toBeInTheDocument(),
    );
  });

  test('should render the region-scoped error text when the promise rejects', async () => {
    const component = renderRegion(Promise.reject(new Error('boom')));

    await waitFor(() =>
      expect(
        component.getByText('Could not load this region.'),
      ).toBeInTheDocument(),
    );
  });

  // 🚨 The revalidation-flash guard. usePlanLifecycleRevalidation hands every
  // region a brand-new promise on each plan/task notification; without the
  // retain behaviour a running plan would flash all its skeletons on every tick.
  test('should keep the last resolved content while a replacement promise is pending', async () => {
    const user = userEvent.setup();
    const component = renderRegion(Promise.resolve('first value'));

    await waitFor(() =>
      expect(component.getByText('first value')).toBeInTheDocument(),
    );

    await user.click(component.getByRole('button', { name: 'revalidate' }));

    // The previous value is still on screen and the skeleton never returned.
    expect(component.getByText('first value')).toBeInTheDocument();
    expect(component.queryByText('Loading region…')).not.toBeInTheDocument();
  });
});
