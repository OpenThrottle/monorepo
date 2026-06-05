export type Writable<T> = {
  -readonly [K in keyof T]: T[K]; // Removes the readonly flag
};
