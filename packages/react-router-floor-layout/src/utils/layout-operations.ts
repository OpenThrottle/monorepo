/**
 * Pure, immutable operations over the {@link FloorLayout} model. Never mutate in
 * place — each returns a new layout. These back both the state hook and the
 * undo/redo history (full-layout snapshots).
 */

import { type Point } from './geometry';
import {
  DisplayUnit,
  FLOOR_LAYOUT_SCHEMA_VERSION,
  type FloorElement,
  type FloorLayout,
} from '../types';

/**
 * Editable fields for {@link updateElement}. `seats` applies to tables only.
 *
 * @publicApi
 */
export interface ElementPatch {
  readonly height?: number;
  readonly label?: string;
  readonly rotation?: number;
  readonly seats?: number;
  readonly width?: number;
}

function mapElement(
  layout: FloorLayout,
  id: string,
  transform: (element: FloorElement) => FloorElement,
): FloorLayout {
  return {
    ...layout,
    elements: layout.elements.map((element) =>
      element.id === id ? transform(element) : element,
    ),
  };
}

/**
 * Append an element to the layout.
 *
 * @publicApi
 */
export function addElement(
  layout: FloorLayout,
  element: FloorElement,
): FloorLayout {
  return { ...layout, elements: [...layout.elements, element] };
}

/**
 * Remove the element with the given id.
 *
 * @publicApi
 */
export function removeElement(layout: FloorLayout, id: string): FloorLayout {
  return {
    ...layout,
    elements: layout.elements.filter((element) => element.id !== id),
  };
}

/**
 * Move an element so its center sits at `center` (world inches).
 *
 * @publicApi
 */
export function moveElement(
  layout: FloorLayout,
  id: string,
  center: Point,
): FloorLayout {
  return mapElement(layout, id, (element) => ({
    ...element,
    x: center.x,
    y: center.y,
  }));
}

/**
 * Apply an edit patch to an element. Preserves the element's discriminated
 * `type`; `seats` is honored only on tables (which already carry it).
 *
 * @publicApi
 */
export function updateElement(
  layout: FloorLayout,
  id: string,
  patch: ElementPatch,
): FloorLayout {
  return mapElement(layout, id, (element) => {
    // Spread `element` first so each member keeps its exact type (notably the
    // zone's required `label`); only override `label` when the patch sets it.
    const sized = {
      ...element,
      height: patch.height ?? element.height,
      rotation: patch.rotation ?? element.rotation,
      width: patch.width ?? element.width,
    };
    const labeled =
      patch.label !== undefined ? { ...sized, label: patch.label } : sized;
    if ('seats' in element) {
      return { ...labeled, seats: patch.seats ?? element.seats };
    }
    return labeled;
  });
}

/**
 * Build a blank floor layout (40' × 30' floor, 1-foot grid, ft-in labels). The
 * caller supplies a stable `id`; pass overrides to tune size/name/unit.
 *
 * @publicApi
 */
export function createEmptyLayout(params: {
  readonly displayUnit?: DisplayUnit;
  readonly gridSize?: number;
  readonly height?: number;
  readonly id: string;
  readonly name?: string;
  readonly width?: number;
}): FloorLayout {
  return {
    displayUnit: params.displayUnit ?? DisplayUnit.FT_IN,
    elements: [],
    gridSize: params.gridSize ?? 12,
    height: params.height ?? 360,
    id: params.id,
    name: params.name ?? 'Untitled floor',
    schemaVersion: FLOOR_LAYOUT_SCHEMA_VERSION,
    width: params.width ?? 480,
  };
}
