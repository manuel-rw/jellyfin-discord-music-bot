export const trimStringToFixedLength = (value: string, maxLength: number) => {
  if (maxLength < 1) {
    throw new Error('max length must be positive');
  }

  return value.length > maxLength
    ? value.substring(0, maxLength - 3) + '...'
    : value;
};
