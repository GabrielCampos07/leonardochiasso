import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { disposeObject3D, disposeOwnedTexture } from './dispose';
import { isTextureLive } from './texture-cache';
import { makePlaceholderTexture, makeSoldOutTexture } from './texture-loader';

describe('disposeObject3D shared textures', () => {
  it('does not GPU-dispose a shared placeholder used by leftover hangers', () => {
    const shared = makePlaceholderTexture();
    const leftover = new Group();
    leftover.add(new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: shared })));
    disposeObject3D(leftover);
    expect(isTextureLive(shared)).toBeTrue();
    expect(makePlaceholderTexture()).toBe(shared);
  });

  it('does not dispose a sold-out badge texture on rebuild', () => {
    const badge = makeSoldOutTexture();
    disposeOwnedTexture(badge);
    expect(isTextureLive(badge)).toBeTrue();
    expect(makeSoldOutTexture()).toBe(badge);
  });
});
