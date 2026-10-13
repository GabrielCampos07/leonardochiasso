import { Mesh, Object3D, PlaneGeometry, MeshBasicMaterial } from 'three';
import { createCollectionRack } from './collection-rack';
import { createGarmentHanger } from './garment-hanger';
import { createJewelryTray } from './jewelry-vitrine';
import {
  hangerSlugFromHits,
  hangerSlugFromObject,
  isIgnoredPick,
  isPointerClick,
  isTap,
  isRoomSurface,
  resolveHangerClick,
  TOUCH_CLICK_SLOP_PX,
} from './hanger-pick';
import type { SceneHanger } from './types';

function garment(slug = 'vestido-lg-bateau'): SceneHanger {
  return {
    productId: slug,
    slug,
    name: 'Vestido LG Bateau',
    imageUrl: null,
    stockQty: 2,
    priceLabel: 'R$ 1.280,00',
    status: 'published',
    rackId: 'organic-dreams',
    kind: 'garment',
  };
}

function jewelry(slug = 'brinco-argola'): SceneHanger {
  return {
    productId: slug,
    slug,
    name: 'Brinco Argola',
    imageUrl: null,
    stockQty: 1,
    priceLabel: 'R$ 180,00',
    status: 'published',
    rackId: 'vitrine:gioielli',
    kind: 'jewelry',
  };
}

function hit(object: Object3D) {
  return { object };
}

describe('hangerSlugFromHits — click → piece modal mapping', () => {
  it('opens the piece modal from the photo, frame, or name plate', () => {
    const hanger = createGarmentHanger(garment());
    for (const name of ['garment', 'frame', 'label', 'labelBack']) {
      const mesh = hanger.getObjectByName(name);
      expect(mesh).toBeTruthy();
      expect(hangerSlugFromObject(mesh)).toBe('vestido-lg-bateau');
      expect(hangerSlugFromHits([hit(mesh!)])).toBe('vestido-lg-bateau');
    }
  });

  it('opens the piece modal from a child that lost its own userData', () => {
    const hanger = createGarmentHanger(garment());
    const photo = hanger.getObjectByName('garment') as Mesh;
    photo.userData = {};
    expect(hangerSlugFromObject(photo)).toBe('vestido-lg-bateau');
  });

  it('opens a jewelry piece from the photo or frame', () => {
    const tray = createJewelryTray(jewelry());
    expect(hangerSlugFromHits([hit(tray.getObjectByName('garment')!)])).toBe('brinco-argola');
    expect(hangerSlugFromHits([hit(tray.getObjectByName('frame')!)])).toBe('brinco-argola');
  });

  it('does not let props, rugs, glass or collection signs steal the piece click', () => {
    const hanger = createGarmentHanger(garment());
    const photo = hanger.getObjectByName('garment') as Mesh;

    const mannequin = new Object3D();
    mannequin.userData = { ignorePick: true, kind: 'mannequin' };
    const mannequinMesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    mannequin.add(mannequinMesh);

    const rug = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    rug.userData = { ignorePick: true, kind: 'rug' };

    const glass = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    glass.userData = { ignorePick: true, kind: 'glass' };

    const plate = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    plate.name = 'plate';
    plate.userData = { kind: 'rack-decor', ignorePick: true };
    const rack = new Object3D();
    rack.userData = { kind: 'rack', rackId: 'organic-dreams' };
    rack.add(plate);

    expect(isIgnoredPick(mannequin)).toBeTrue();
    expect(hangerSlugFromHits([hit(mannequinMesh), hit(rug), hit(glass), hit(plate), hit(photo)])).toBe(
      'vestido-lg-bateau',
    );
  });

  it('does not open a modal when only props are under the pointer', () => {
    const plant = new Object3D();
    plant.userData = { ignorePick: true, kind: 'plant' };
    const leaf = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    plant.add(leaf);
    expect(hangerSlugFromHits([hit(leaf), hit(plant)])).toBeNull();
  });

  it('opens from a mounted rack photo or hanger name plate, not the collection sign', () => {
    const rack = createCollectionRack(
      {
        id: 'organic-dreams',
        name: 'Organic Dreams',
        sortOrder: 1,
        hangers: [garment()],
        kind: 'rack',
      },
      0,
    );
    const hanger = rack.getObjectByName('hanger:vestido-lg-bateau') as Object3D;
    const photo = hanger.getObjectByName('garment') as Mesh;
    const namePlate = hanger.getObjectByName('label') as Mesh;
    const sign = rack.getObjectByName('plate') as Mesh;
    expect(hangerSlugFromHits([hit(photo)])).toBe('vestido-lg-bateau');
    expect(hangerSlugFromHits([hit(namePlate)])).toBe('vestido-lg-bateau');
    expect(hangerSlugFromHits([hit(sign)])).toBeNull();
    expect(hangerSlugFromHits([hit(sign), hit(photo)])).toBe('vestido-lg-bateau');
  });

  it('does not look through the floor or wall to open a piece', () => {
    const hanger = createGarmentHanger(garment());
    const photo = hanger.getObjectByName('garment') as Mesh;
    const floor = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    floor.name = 'floor';
    floor.userData = { ignorePick: true, kind: 'floor' };
    const wall = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    wall.name = 'wall';
    wall.userData = { ignorePick: true, kind: 'wall' };
    expect(isRoomSurface(floor)).toBeTrue();
    expect(isRoomSurface(wall)).toBeTrue();
    expect(hangerSlugFromHits([hit(floor), hit(photo)])).toBeNull();
    expect(hangerSlugFromHits([hit(wall), hit(photo)])).toBeNull();
    expect(hangerSlugFromHits([hit(photo), hit(wall)])).toBe('vestido-lg-bateau');
  });

  it('does not map a collection sign to a product', () => {
    const plate = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial());
    plate.userData = { kind: 'rack-decor', ignorePick: true };
    expect(hangerSlugFromHits([hit(plate)])).toBeNull();
  });
});

describe('resolveHangerClick', () => {
  it('uses the pointerdown pick so orbit restore cannot miss the piece', () => {
    expect(
      resolveHangerClick({
        pointerDownSlug: 'vestido-lg-bateau',
        pointerUpSlug: null,
        hoverSlug: 'vestido-lg-bateau',
        dx: 3,
        dy: -4,
      }),
    ).toBe('vestido-lg-bateau');
  });

  it('falls back to the live hover slug when the up-ray misses', () => {
    expect(
      resolveHangerClick({
        pointerDownSlug: null,
        pointerUpSlug: null,
        hoverSlug: 'vestido-lg-bateau',
        dx: 0,
        dy: 0,
      }),
    ).toBe('vestido-lg-bateau');
  });

  it('ignores a drag past the slop', () => {
    expect(
      resolveHangerClick({
        pointerDownSlug: 'vestido-lg-bateau',
        pointerUpSlug: 'vestido-lg-bateau',
        hoverSlug: 'vestido-lg-bateau',
        dx: 20,
        dy: 0,
      }),
    ).toBeNull();
    expect(isPointerClick(5, 0)).toBeTrue();
    expect(isPointerClick(6, 0)).toBeFalse();
  });

  it('counts a first iOS tap that wobbles past the mouse slop', () => {
    expect(isTap(10, 8, 'touch')).toBeTrue();
    expect(isTap(10, 8, 'mouse')).toBeFalse();
    expect(isTap(TOUCH_CLICK_SLOP_PX + 1, 0, 'touch')).toBeFalse();
    expect(
      resolveHangerClick({
        pointerDownSlug: 'vestido-lg-bateau',
        pointerUpSlug: 'vestido-lg-bateau',
        hoverSlug: null,
        dx: 10,
        dy: 8,
        pointerType: 'touch',
      }),
    ).toBe('vestido-lg-bateau');
    expect(
      resolveHangerClick({
        pointerDownSlug: 'vestido-lg-bateau',
        pointerUpSlug: 'vestido-lg-bateau',
        hoverSlug: null,
        dx: 10,
        dy: 8,
        pointerType: 'mouse',
      }),
    ).toBeNull();
  });

  it('ignores a hold longer than 300ms even if the pointer barely moved', () => {
    expect(
      resolveHangerClick({
        pointerDownSlug: 'vestido-lg-bateau',
        pointerUpSlug: 'vestido-lg-bateau',
        hoverSlug: 'vestido-lg-bateau',
        dx: 1,
        dy: 1,
        durationMs: 301,
      }),
    ).toBeNull();
    expect(
      resolveHangerClick({
        pointerDownSlug: 'vestido-lg-bateau',
        pointerUpSlug: 'vestido-lg-bateau',
        hoverSlug: 'vestido-lg-bateau',
        dx: 1,
        dy: 1,
        durationMs: 120,
      }),
    ).toBe('vestido-lg-bateau');
  });
});
