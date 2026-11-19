import { atom } from 'jotai';

import type { GetMyUserQuery } from '~/__generated__/graphql';

export const userAtom = atom<NonNullable<GetMyUserQuery['me']> | null>(null);
