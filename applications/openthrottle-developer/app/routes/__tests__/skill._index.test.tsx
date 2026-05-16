import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import SkillsIndex from '../skills._index';

/**
 * @description Route module is `skills._index`; this spec file name is historical.
 */
describe('routes/skills._index.tsx', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <SkillsIndex
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('SkillsTable')).toBeInTheDocument();
  });
});
