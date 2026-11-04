import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Permission } from '~/global/config/permissions';
import { PERMISSIONS, ROOT_ROUTE_ID } from '~/global/config/permissions';

import { useHasPermission } from '../useHasPermission';

function Probe(props: { readonly permission: Permission }): React.ReactElement {
  const allowed = useHasPermission(props.permission);

  return <p>{allowed ? 'allowed' : 'denied'}</p>;
}

const renderProbe = (
  rootLoaderData: Record<string, unknown> | undefined,
): ReturnType<typeof render> => {
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp
      Component: () => <Probe permission={PERMISSIONS.BLOG_DRAFT} />,
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

describe('useHasPermission', () => {
  test('is true when the root loader lists the permission', () => {
    const component = renderProbe({ permissions: ['blog:draft'] });

    expect(component.getByText('allowed')).toBeDefined();
  });

  test('is false when the root loader lacks the permission', () => {
    const component = renderProbe({ permissions: ['users:read'] });

    expect(component.getByText('denied')).toBeDefined();
  });

  test('is false when the root loader carries no permissions', () => {
    const component = renderProbe(undefined);

    expect(component.getByText('denied')).toBeDefined();
  });
});
