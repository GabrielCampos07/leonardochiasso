import { MeshBasicMaterial, MeshStandardMaterial, Texture } from 'three';
import { applyPhotoMap, isPhotoMaterial, makePhotoMaterial } from './photo-material';

describe('photo materials', () => {
  it('builds an unlit sRGB plane excluded from tone mapping', () => {
    const texture = new Texture();
    const material = makePhotoMaterial(texture);
    expect(material).toBeInstanceOf(MeshBasicMaterial);
    expect(material.toneMapped).toBeFalse();
    expect(material.fog).toBeFalse();
    expect(material.transparent).toBeFalse();
    expect(material.depthWrite).toBeTrue();
    expect(isPhotoMaterial(material)).toBeTrue();
    expect(isPhotoMaterial(new MeshStandardMaterial())).toBeFalse();
    applyPhotoMap(material, texture);
    expect(material.toneMapped).toBeFalse();
    expect(material.color.getHex()).toBe(0xffffff);
    material.dispose();
    texture.dispose();
  });
});
