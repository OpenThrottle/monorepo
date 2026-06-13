import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { IdeSearchForm } from '../IdeSearchForm';

describe('IdeSearchForm Component', () => {
  let component: RenderResult;

  test('renders seeded from defaultQuery', () => {
    component = render(<IdeSearchForm defaultQuery="ripgrep" />);

    expect(component.getByRole('searchbox')).toHaveValue('ripgrep');
  });

  test('emits the trimmed query on submit', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    component = render(<IdeSearchForm onSearch={onSearch} />);

    await user.type(component.getByRole('searchbox'), '  useDebouncedValue  ');
    await user.click(component.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('useDebouncedValue');
  });
});
