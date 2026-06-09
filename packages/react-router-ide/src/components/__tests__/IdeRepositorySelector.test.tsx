import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { IdeRepositorySelector } from '../IdeRepositorySelector';
import type { IdeRepositoryOption } from '../IdeRepositorySelector';

const options: IdeRepositoryOption[] = [
  { id: 'r1', label: 'Repo One' },
  { id: 'r2', label: 'Repo Two' },
];

describe('IdeRepositorySelector Component', () => {
  let component: RenderResult;

  test('shows the selected repository label', () => {
    component = render(
      <IdeRepositorySelector options={options} selectedId="r1" />,
    );

    expect(component.getByRole('combobox')).toHaveTextContent('Repo One');
  });

  test('is disabled and prompts to add a repo when there are none', () => {
    component = render(<IdeRepositorySelector options={[]} />);

    const trigger = component.getByRole('combobox');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent(/Settings → Workspace/);
  });

  test('emits the chosen repository id on selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    component = render(
      <IdeRepositorySelector onSelect={onSelect} options={options} />,
    );

    await user.click(component.getByRole('combobox'));
    await waitFor(() => {
      expect(component.getByRole('listbox')).toBeInTheDocument();
    });
    await user.click(component.getByRole('option', { name: 'Repo Two' }));

    expect(onSelect).toHaveBeenCalledWith('r2');
  });
});
