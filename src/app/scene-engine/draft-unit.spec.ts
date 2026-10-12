import { DRAFT_GROUP_NAME, createDraftOutline, setDraftPlateName } from './draft-unit';
import { DRAFT_UNIT_ID } from './unit-layout';

describe('createDraftOutline', () => {
  it('builds a rack ghost with a live plate', () => {
    const group = createDraftOutline('rack', 'Nova linha', 4);
    expect(group.name).toBe(DRAFT_GROUP_NAME);
    expect(group.userData['rackId']).toBe(DRAFT_UNIT_ID);
    expect(group.getObjectByName('plate')).toBeTruthy();
    setDraftPlateName(group, 'Verão');
    expect(group.getObjectByName('plate')).toBeTruthy();
  });

  it('builds a vitrine ghost when the line is joias', () => {
    const group = createDraftOutline('vitrine', 'Gioielli', 2);
    expect(group.userData['unitKind']).toBe('vitrine');
    expect(group.children.length).toBeGreaterThan(2);
  });
});
