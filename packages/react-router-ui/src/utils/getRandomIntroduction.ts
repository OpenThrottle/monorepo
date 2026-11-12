import { INTRODUCTIONS } from '../data/data.introductions';

/**
 * @description Returns one introduction at random from {@link INTRODUCTIONS}.
 * @public
 */
export const getRandomIntroduction = (): string => {
  const index = Math.floor(Math.random() * INTRODUCTIONS.length);
  const introduction = INTRODUCTIONS[index];

  return introduction?.text ?? INTRODUCTIONS[0]?.text ?? '';
};
