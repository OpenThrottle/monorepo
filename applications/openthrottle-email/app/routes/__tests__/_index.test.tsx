import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import Route, { loader, meta } from '../_index';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route as RouteTypes } from '@/app/routes/+types/_index';

describe('routes/_index.tsx', () => {
  test('loader redirects to the mail inbox', async () => {
    const response = await loader(
      createLoaderArgs<RouteTypes.LoaderArgs>({
        url: 'http://localhost/',
      }),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/mail/');
  });

  test('returns site title from meta', () => {
    // @ts-expect-error - we're testing the function
    expect(meta({})).toEqual([{ title: SITE_TITLE }]);
  });

  test('renders nothing (redirect-only pathless layout)', () => {
    const RoutesStub = createRoutesStub([{ Component: Route, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.container).toBeEmptyDOMElement();
  });
});
