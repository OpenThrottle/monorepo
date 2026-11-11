import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { REORDER_HANDLE_COPY } from '../../data';
import { ReorderHandle } from '../ReorderHandle';

describe('ReorderHandle', () => {
  let component: RenderResult;
  const handleRef = vi.fn();

  beforeEach(() => {
    handleRef.mockClear();
    component = render(
      <ReorderHandle className={undefined} handleRef={handleRef} />,
    );
  });

  test('is a button named for what it does', () => {
    expect(
      component.getByRole('button', { name: REORDER_HANDLE_COPY.label }),
    ).toHaveAttribute('type', 'button');
  });

  test('hands its element to the drag-source ref', () => {
    expect(handleRef).toHaveBeenCalledWith(
      component.getByRole('button', { name: REORDER_HANDLE_COPY.label }),
    );
  });
});
