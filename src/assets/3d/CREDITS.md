# Atelier 3D assets

All shipped files are CC0 or modeled in-repo. No purchased assets.

| File | Size (KB) | License | Author | Source |
| --- | ---: | --- | --- | --- |
| `hdri-studio-small-08-512.ae1fc852.hdr` | 389.7 | CC0 | Greg Zaal / Poly Haven | https://polyhaven.com/a/studio_small_08 (512×256 RGBE downsample of the 1k original) |
| `tex-wood-floor-diff.531d0840.ktx2` | 38.7 | CC0 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/wood_floor |
| `tex-wood-floor-diff.531d0840.jpg` | 21.0 | CC0 | Rob Tuytel / Poly Haven | jpg fallback |
| `tex-light-wood-diff.7f175455.ktx2` | 45.9 | CC0 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/wood_cabinet_worn_long |
| `tex-light-wood-diff.7f175455.jpg` | 32.6 | CC0 | Rob Tuytel / Poly Haven | jpg fallback |
| `tex-plaster-wall-diff.bef42e7d.ktx2` | 34.6 | CC0 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/plastered_wall |
| `tex-plaster-wall-diff.bef42e7d.jpg` | 13.0 | CC0 | Rob Tuytel / Poly Haven | jpg fallback |
| `mdl-hanger.61a1e542.glb` | 6.2 | CC0 | Leonardo Chiasso atelier | Modeled in code, Meshopt |
| `mdl-jewelry-tray.67115f7d.glb` | 4.4 | CC0 | Leonardo Chiasso atelier | Modeled in code, Meshopt |
| `mdl-vitrine.64ba2829.glb` | 5.1 | CC0 | Leonardo Chiasso atelier | Modeled in code, Meshopt |
| `mdl-mannequin.7d3d0875.glb` | 20.7 | CC0 | Leonardo Chiasso atelier | Dress form + brass stand, Meshopt |
| `mdl-plant-potted.96aa11c9.glb` | 14.2 | CC0 | Leonardo Chiasso atelier | Ficus-style pot, Meshopt |

HDRI is a 512×256 RGBE (under 400 KB). Meshes use `EXT_meshopt_compression`. Textures ship as KTX2 (ETC1S) with JPEG fallback. The Basis transcoder (`basis/`) is only needed if a runtime prefers KTX2; room plaster uses the JPEG fallback on first paint so the 527 KB wasm is not on the critical path.

Dynamic rails, hangers, vitrines, and trays stay procedural so width/rows follow stock. The dress-form and plants load after the first frame.
