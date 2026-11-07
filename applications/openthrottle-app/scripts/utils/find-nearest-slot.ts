/** @description The stage folder a package lives in, as Node's resolver sees it. */
export const slotOf = (dir: string, name: string): string => {
  return dir === '' ? `node_modules/${name}` : `${dir}/node_modules/${name}`;
};

const parentDir = (dir: string): string | undefined => {
  if (dir === '') {
    return undefined;
  }

  const at = dir.lastIndexOf('/node_modules/');

  return at === -1 ? '' : dir.slice(0, at);
};

/**
 * @description Simulates Node's `node_modules` lookup: starting at `dir` (a
 * package folder, or `''` for the stage root) and walking up through the
 * enclosing packages, returns the first slot `name` is placed at.
 */
export const findNearestSlot = (
  hasSlot: (slot: string) => boolean,
  dir: string,
  name: string,
): string | undefined => {
  let current: string | undefined = dir;

  while (current !== undefined) {
    const slot = slotOf(current, name);

    if (hasSlot(slot)) {
      return slot;
    }

    current = parentDir(current);
  }

  return undefined;
};
