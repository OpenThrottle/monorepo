import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type Point } from '../../utils/geometry';
import { FloorElementType } from '../../types';
import { ElementPalette } from '../ElementPalette';

const identity = (client: Point): Point => client;

describe('ElementPalette', () => {
  it('renders a toolbar with a button per palette item', () => {
    const component = render(
      <ElementPalette
        clientToWorld={identity}
        items={[
          { label: 'Round table', type: FloorElementType.TABLE_ROUND },
          { label: 'Wall', type: FloorElementType.WALL },
        ]}
        onCreateCommit={vi.fn()}
      />,
    );

    expect(
      component.getByRole('toolbar', { name: 'Floor elements' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Round table' }),
    ).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Wall' })).toBeInTheDocument();
  });

  it('renders the full default catalog when items is omitted', () => {
    const component = render(
      <ElementPalette clientToWorld={identity} onCreateCommit={vi.fn()} />,
    );

    expect(component.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('starts a create drag on pointer-down and reports a live preview on move', async () => {
    const user = userEvent.setup();
    const onCreatePreview = vi.fn();
    const component = render(
      <ElementPalette
        clientToWorld={identity}
        items={[{ label: 'Round table', type: FloorElementType.TABLE_ROUND }]}
        onCreateCommit={vi.fn()}
        onCreatePreview={onCreatePreview}
        snapEnabled={false}
      />,
    );

    const button = component.getByRole('button', { name: 'Round table' });

    await user.pointer([
      { coords: { x: 10, y: 10 }, keys: '[MouseLeft>]', target: button },
      { coords: { x: 40, y: 60 } },
    ]);

    expect(onCreatePreview).toHaveBeenCalledWith(FloorElementType.TABLE_ROUND, {
      x: 40,
      y: 60,
    });
  });

  it('commits a new element of the dragged type at the drop point on pointer-up', async () => {
    const user = userEvent.setup();
    const onCreateCommit = vi.fn();
    const onCreatePreview = vi.fn();
    const component = render(
      <ElementPalette
        clientToWorld={identity}
        items={[{ label: 'Wall', type: FloorElementType.WALL }]}
        onCreateCommit={onCreateCommit}
        onCreatePreview={onCreatePreview}
        snapEnabled={false}
      />,
    );

    const button = component.getByRole('button', { name: 'Wall' });

    await user.pointer([
      { coords: { x: 10, y: 10 }, keys: '[MouseLeft>]', target: button },
      { coords: { x: 50, y: 50 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onCreateCommit).toHaveBeenCalledWith(FloorElementType.WALL, {
      x: 50,
      y: 50,
    });
    // Preview clears on commit.
    expect(onCreatePreview).toHaveBeenLastCalledWith(null, null);
  });

  it('snaps the drop point to the grid when snapEnabled', async () => {
    const user = userEvent.setup();
    const onCreateCommit = vi.fn();
    const component = render(
      <ElementPalette
        clientToWorld={identity}
        gridSize={12}
        items={[{ label: 'Wall', type: FloorElementType.WALL }]}
        onCreateCommit={onCreateCommit}
        snapEnabled={true}
      />,
    );

    const button = component.getByRole('button', { name: 'Wall' });

    await user.pointer([
      { coords: { x: 10, y: 10 }, keys: '[MouseLeft>]', target: button },
      { coords: { x: 47, y: 47 } },
      { keys: '[/MouseLeft]' },
    ]);

    // 47 snapped to a grid of 12 -> 48.
    expect(onCreateCommit).toHaveBeenCalledWith(FloorElementType.WALL, {
      x: 48,
      y: 48,
    });
  });
});
