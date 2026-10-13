import { OVERVIEW_FOCUS_ID } from './camera-guide';
import { inFocusUpgradeSlugs } from './photo-lod';
import { rackStartPanX } from './rack-pan';
import { DRAFT_UNIT_ID } from './unit-layout';
import type { SceneHanger, SceneLayout, SceneRack } from './types';

function hanger(slug: string, rackId: string): SceneHanger {
  return {
    productId: slug,
    slug,
    name: slug,
    imageUrl: `https://cdn.example/pdp/pdp-${slug}-01.webp`,
    thumbUrl: `https://cdn.example/pdp/plp-${slug}-thumb.webp`,
    stockQty: 1,
    priceLabel: 'R$ 1,00',
    status: 'published',
    rackId,
    kind: 'garment',
  };
}

function rack(id: string, count: number): SceneRack {
  return {
    id,
    name: id,
    sortOrder: 0,
    kind: 'rack',
    hangers: Array.from({ length: count }, (_, i) => hanger(`${id}-${i}`, id)),
  };
}

function layout(...racks: SceneRack[]): SceneLayout {
  return { racks };
}

describe('inFocusUpgradeSlugs', () => {
  it('upgrades nobody in overview or draft', () => {
    const scene = layout(rack('niponic-dreams', 8));
    expect(inFocusUpgradeSlugs(scene, OVERVIEW_FOCUS_ID, null)).toEqual([]);
    expect(inFocusUpgradeSlugs(scene, DRAFT_UNIT_ID, null)).toEqual([]);
  });

  it('upgrades only the framed window on a long focused rack', () => {
    const scene = layout(rack('niponic-dreams', 19), rack('organic-dreams', 8));
    const slugs = inFocusUpgradeSlugs(scene, 'niponic-dreams', null, rackStartPanX(19));
    expect(slugs).toContain('niponic-dreams-0');
    expect(slugs).not.toContain('niponic-dreams-9');
    expect(slugs).not.toContain('organic-dreams-0');
    expect(slugs.every((slug) => slug.startsWith('niponic-dreams-'))).toBeTrue();
  });

  it('upgrades a focused piece and its neighbors only', () => {
    const scene = layout(rack('niponic-dreams', 8));
    expect(inFocusUpgradeSlugs(scene, 'niponic-dreams', 'niponic-dreams-3')).toEqual([
      'niponic-dreams-2',
      'niponic-dreams-3',
      'niponic-dreams-4',
    ]);
  });
});
