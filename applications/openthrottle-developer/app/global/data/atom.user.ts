import { atom } from 'jotai';
import { UserObject } from '~/__generated__/graphql';

export const userAtom = atom<UserObject | null>(null);
