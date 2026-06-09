import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SemanticSearchForm } from '../SemanticSearchForm';

describe('SemanticSearchForm Component', () => {
  let component: RenderResult;

  test('emits the trimmed query on submit', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    component = render(<SemanticSearchForm onSearch={onSearch} />);

    await user.type(component.getByRole('searchbox'), '  where is auth  ');
    await user.click(component.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('where is auth');
  });

  test('disables the input and button when disabled', () => {
    component = render(<SemanticSearchForm disabled={true} />);

    expect(component.getByRole('searchbox')).toBeDisabled();
    expect(component.getByRole('button', { name: 'Search' })).toBeDisabled();
  });
});
