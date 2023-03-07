export const chunkArray = <T>(a: T[], size): T[][] =>
  Array.from(new Array(Math.ceil(a.length / size)), (_, i) =>
    a.slice(i * size, i * size + size),
  );
