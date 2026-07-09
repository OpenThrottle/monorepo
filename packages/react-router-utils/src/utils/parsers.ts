export const parseShortUUID = (uuid?: string | null): string => {
  if (uuid == null) {
    return '';
  }

  if (uuid.length < 8) {
    return uuid;
  }

  return uuid.slice(0, 8);
};
