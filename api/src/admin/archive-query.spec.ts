import { archivedAtWhere, parseArchivedFlag } from './archive-query';

describe('parseArchivedFlag', () => {
  it('is true only for true/1', () => {
    expect(parseArchivedFlag('true')).toBe(true);
    expect(parseArchivedFlag('1')).toBe(true);
    expect(parseArchivedFlag(['true'])).toBe(true);
    expect(parseArchivedFlag('false')).toBe(false);
    expect(parseArchivedFlag('')).toBe(false);
    expect(parseArchivedFlag(undefined)).toBe(false);
  });
});

describe('archivedAtWhere', () => {
  it('defaults to live rows', () => {
    expect(archivedAtWhere(false)).toEqual({ archivedAt: null });
    expect(archivedAtWhere(true)).toEqual({ archivedAt: { not: null } });
  });
});
