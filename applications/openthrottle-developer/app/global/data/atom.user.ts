import { atom } from 'jotai';
import type { UserObject } from '~/__generated__/graphql';

export const userAtom = atom<UserObject | null>(null);
