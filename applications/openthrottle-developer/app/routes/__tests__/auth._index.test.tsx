import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import AuthIndex from '../auth._index';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('routes/auth._index.tsx', () => {
  test('renders sign-in form', () => {
    renderRoutesStub(
      <AuthIndex
        actionData={undefined}
        loaderData={{}}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
