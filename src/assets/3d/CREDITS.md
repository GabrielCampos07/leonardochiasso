# Atelier 3D assets

All shipped files are CC0 or modeled in-repo. No purchased assets.

| File | Size (KB) | License | Author | Source |
| --- | ---: | --- | --- | --- |
| `hdri-studio-small-08-1k.f6a989f8.hdr` | 1473.5 | CC0 | Greg Zaal / Poly Haven | https://polyhaven.com/a/studio_small_08 |
| `tex-wood-floor-diff.531d0840.jpg` | 21.0 | CC0 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/wood_floor |
| `tex-light-wood-diff.7f175455.jpg` | 32.6 | CC0 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/wood_cabinet_worn_long |
| `tex-plaster-wall-diff.bef42e7d.jpg` | 13.0 | CC0 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/plastered_wall |
| `mdl-coat-rack.d8231c22.glb` | 13.0 | CC0 | Kenney | https://kenney.nl/assets/furniture-kit |
| `mdl-plant-potted.5b760eda.glb` | 7.4 | CC0 | Kenney | https://kenney.nl/assets/furniture-kit |
| `mdl-plant-bush.d7c8ff42.glb` | 12.7 | CC0 | Kenney | https://kenney.nl/assets/furniture-kit |
| `mdl-hanger.5a1292b8.glb` | 9.9 | CC0 | Leonardo Chiasso atelier | Modeled in code (three.js) |
| `mdl-jewelry-tray.b25f1b38.glb` | 6.3 | CC0 | Leonardo Chiasso atelier | Modeled in code (three.js) |
| `mdl-vitrine.90eaa2e6.glb` | 7.8 | CC0 | Leonardo Chiasso atelier | Modeled in code (three.js) |
| `mdl-mannequin.a721699c.glb` | 20.0 | CC0 | Leonardo Chiasso atelier | Modeled in code (three.js) |

Textures are 512px JPEG (hashed). HDRI is Poly Haven 1k `.hdr`. Meshes are compact glTF-binary (under 21 KB each); Draco/Meshopt omitted because payloads are already smaller than a transcoder.

Room furniture that must match hanger layout (rails, hangers, vitrines, trays) is still built in `scene-engine/` so width/rows stay dynamic. The Kenney coat rack and generated dress-form / plant glTFs load after the first frame.
