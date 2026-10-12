import { UNCOLLECTED_RACK_ID } from '../../../scene-engine/types';
import { collectionSlugFromUnitId } from './atelier-blank';

describe('collectionSlugFromUnitId', () => {
  it('strips the vitrine prefix and ignores Sem coleção', () => {
    expect(collectionSlugFromUnitId('organic-dreams')).toBe('organic-dreams');
    expect(collectionSlugFromUnitId('vitrine:gioielli')).toBe('gioielli');
    expect(collectionSlugFromUnitId('vitrine:organic-dreams:2')).toBe('organic-dreams');
    expect(collectionSlugFromUnitId(UNCOLLECTED_RACK_ID)).toBe('');
  });
});
