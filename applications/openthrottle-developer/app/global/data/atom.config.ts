import { atom } from 'jotai';

export interface ConfigObject {
  accentColor: string | undefined;
  theme: 'light' | 'dark';
}

const configDefault: ConfigObject = {
  accentColor: undefined,
  theme: 'light',
};

export const configAtom = atom<ConfigObject>(configDefault);
