import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ROOT_ROUTE_ID } from '~/global/config/permissions';

import { usePermissions } from '../usePermissions';

function Probe(): React.ReactElement {
  const permissions = usePermissions();

  return <p>{permissions.length > 0 ? permissions.join(',') : 'none'}</p>;
}

const renderProbe = (
  rootLoaderData: Record<string, unknown> | undefined,
): ReturnType<typeof render> => {
  const Stub = createRoutesStub([
    {
      Component: Probe,
      id: ROOT_ROUTE_ID,
      loader: () => rootLoaderData ?? {},
      path: '/',
    },
  ]);

  return render(
    <Stub
      hydrationData={{
        loaderData: { [ROOT_ROUTE_ID]: rootLoaderData ?? {} },
      }}
    />,
  );
};

describe('usePermissions', () => {
  test('returns the permissions the root loader lists', () => {
    const component = renderProbe({
      permissions: ['blog:draft', 'users:read'],
    });

    expect(component.getByText('blog:draft,users:read')).toBeDefined();
  });

  test('returns an empty list when the root loader carries no permissions', () => {
    const component = renderProbe(undefined);

    expect(component.getByText('none')).toBeDefined();
  });
});
