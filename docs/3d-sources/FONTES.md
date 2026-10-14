# 3D sources — `/admin/3d` rebuild (phase 1)

Verified candidate models for the two scene options. Every row below had its model page opened and its licence confirmed on 2026-10-14; the screenshot in `licencas/` is the evidence. Rejected candidates live in [`REMOVIDOS.md`](REMOVIDOS.md).

| Option | Route | Licences allowed |
| --- | --- | --- |
| A | `/admin/3d?cc0=1` | CC0 only — Poly Haven, Kenney (Quaternius rejected, see `REMOVIDOS.md`) |
| B | `/admin/3d?sketchfab=1` | Sketchfab **CC-BY 4.0** + any CC0 row from option A |

Forbidden everywhere: NC, ND, Editorial, NoAI. CC-BY rows require the in-app **Créditos** screen (author, model link, licence link, "modified: compressed/retextured").

## Size columns

- **Raw** — the `.glb` as obtained. Poly Haven: the 1K glTF packed to GLB (textures embedded). Kenney: the shipped GLB with its external `colormap.png` embedded. Sketchfab: the GLB archive size reported by the Sketchfab API for the download (the file itself needs an API token, see below).
- **Meshopt / Draco** — `gltf-transform` 4.5.1 `optimize --compress meshopt|draco --texture-compress webp --texture-size 1024 --simplify false --join false --flatten false --instance false --palette false`. Measured on the real file for options A rows. For Sketchfab rows it is an **estimate** (`~`): geometry × 0.3 plus ~60 KB per 1K WebP map (~20 KB at 512, ~2–6 KB at ≤256), calibrated on the Poly Haven files measured here; expect ±50 % until the file is downloaded.
- Files under ~10 KB can grow slightly with Meshopt (extension overhead); Draco stays smaller.
- **Budget** — target ≈ 5 MB (5 000 KB) per scene; percentages are of that figure. ⚠ marks a model that alone would take ≥ 40 % of it raw, exceed it, or ship > 1 MB compressed; the alternative is in the note.

## Option A — CC0

### Kenney (CC0)

Licence: [Furniture Kit](https://kenney.nl/assets/furniture-kit) and [Mini Market](https://kenney.nl/assets/mini-market) pages both read "Creative Commons CC0"; the downloaded `License.txt` in each zip says the same. Author: Kenney (Mini Market additional credits: Fleur Keijsers, Guus Vermeulen). Screenshots: `licencas/kenney-furniture-kit.webp`, `licencas/kenney-mini-market.webp`.

| Item | Model (file in kit) | Kit | Tris | Raw KB | Meshopt KB | Draco KB | Budget |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Floor | `floor.glb` | Mini Market | 24 | 12.1 | 4.7 | 3.5 | ok |
| Floor | `floorFull.glb` | Furniture Kit | 12 | 1.9 | 2.0 | 1.1 | ok |
| Wall | `wall.glb` | Mini Market | 32 | 12.5 | 4.8 | 3.7 | ok |
| Wall | `wall-window.glb` | Mini Market | 146 | 23.2 | 7.7 | 5.1 | ok |
| Wall / column | `column.glb` | Mini Market | 188 | 26.8 | 6.9 | 4.4 | ok |
| Wall | `wall.glb` | Furniture Kit | 12 | 2.6 | 4.0 | 2.4 | ok |
| Wall | `wallWindow.glb` | Furniture Kit | 108 | 9.5 | 7.2 | 4.2 | ok |
| Wall | `wallDoorwayWide.glb` | Furniture Kit | 60 | 5.7 | 4.5 | 2.7 | ok |
| Rack (gondola stand-in) | `shelf-end.glb` | Mini Market | 362 | 49.0 | 12.4 | 7.5 | ok |
| Rack (gondola stand-in) | `shelf-boxes.glb` | Mini Market | 436 | 59.9 | 13.4 | 8.0 | ok |
| Rack (coat-stand stand-in) | `coatRackStanding.glb` | Furniture Kit | 190 | 12.7 | 3.8 | 1.8 | ok |
| Piece (stand-in) | `cardboardBoxClosed.glb` | Furniture Kit | 60 | 4.8 | 3.5 | 2.1 | ok |
| Piece (stand-in) | `cardboardBoxOpen.glb` | Furniture Kit | 60 | 4.8 | 3.5 | 2.1 | ok |
| Piece (wall hook stand-in) | `coatRack.glb` | Furniture Kit | 132 | 9.3 | 4.2 | 2.4 | ok |
| Counter | `kitchenBar.glb` | Furniture Kit | 76 | 5.3 | 4.6 | 2.9 | ok |
| Counter | `kitchenBarEnd.glb` | Furniture Kit | 152 | 10.4 | 4.6 | 2.4 | ok |
| Counter | `cash-register.glb` | Mini Market | 203 | 28.1 | 7.4 | 4.6 | ok |
| Shelves | `bookcaseOpen.glb` | Furniture Kit | 320 | 17.3 | 4.2 | 1.9 | ok |
| Shelves | `bookcaseOpenLow.glb` | Furniture Kit | 184 | 11.0 | 3.4 | 1.6 | ok |
| Shelves | `sideTableDrawers.glb` | Furniture Kit | 238 | 17.5 | 7.1 | 3.9 | ok |
| Plant | `pottedPlant.glb` | Furniture Kit | 60 | 6.7 | 5.1 | 3.1 | ok |
| Plant | `plantSmall1.glb` | Furniture Kit | 102 | 7.6 | 4.1 | 2.3 | ok |
| Rug (extra) | `rugRectangle.glb` | Furniture Kit | 28 | 2.7 | 3.2 | 1.9 | ok |

Downloads: [kenney_furniture-kit.zip](https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip), [kenney_mini-market.zip](https://kenney.nl/media/pages/assets/mini-market/463f38da51-1729865423/kenney_mini-market.zip).

### Poly Haven (CC0)

Licence: every asset page shows "CC0 License" under the author, and <https://polyhaven.com/license> states all assets are CC0 (`licencas/polyhaven-license.webp`). Downloaded through `https://api.polyhaven.com/files/<id>` at 1K.

| Item | Model | URL | Author | Tris | Raw KB | Meshopt KB | Draco KB | Budget | Screenshot |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Rack (stockroom shelving) | Steel Frame Shelves 01 | <https://polyhaven.com/a/steel_frame_shelves_01> | James Ray Cock | 4 348 | 1 559.0 | 178.7 | 159.9 | ok compressed; raw 31 % | `polyhaven-steel_frame_shelves_01.webp` |
| Rack (stockroom shelving) | Worn Metal Rack | <https://polyhaven.com/a/worn_metal_rack> | Luca B | 6 372 | 1 961.0 | 259.8 | 224.4 | ok compressed; raw 39 % | `polyhaven-worn_metal_rack.webp` |
| Counter | Classic Console 01 | <https://polyhaven.com/a/ClassicConsole_01> | Kirill Sannikov | 7 566 | 722.4 | 333.8 | 293.9 | ok | `polyhaven-ClassicConsole_01.webp` |
| Counter | Modern Wooden Cabinet | <https://polyhaven.com/a/modern_wooden_cabinet> | Patrik Pangerl | 24 976 | 2 783.5 | 450.0 | 265.3 | ⚠ raw 56 % — use Classic Console 01 or Kenney `kitchenBar` | `polyhaven-modern_wooden_cabinet.webp` |
| Shelves | Wooden Display Shelves 01 | <https://polyhaven.com/a/wooden_display_shelves_01> | James Ray Cock | 3 174 | 457.3 | 165.0 | 156.8 | ok | `polyhaven-wooden_display_shelves_01.webp` |
| Shelves | Drawer Cabinet | <https://polyhaven.com/a/drawer_cabinet> | Ulan Cabanilla | 26 406 | 1 113.3 | 316.6 | 206.4 | ok | `polyhaven-drawer_cabinet.webp` |
| Plant | Potted Plant 04 | <https://polyhaven.com/a/potted_plant_04> | James Ray Cock | 8 929 | 2 069.8 | 397.4 | 367.7 | ⚠ raw 41 % — ship compressed only, or Kenney `pottedPlant` | `polyhaven-potted_plant_04.webp` |

### Option A gaps

- **Clothing rail and garment hanger: no CC0 model exists** on Poly Haven or Kenney (full Kenney 3D catalogue checked), and Sketchfab's CC0 filter returns none either. Stand-ins above turn option A into a WareTrack-style **stockroom**: one shelving unit / gondola per collection, one box per piece. If Gabriel wants real rails and hangers in option A, the choices are (1) an in-house Blender model exported to `.glb` and released CC0 by Leonardo Chiasso, or (2) accept option B for those two items.
- **Mannequin: no CC0 model** in the allowed sources. Optional item — drop it from option A.
- Poly Haven models are photoreal PBR; Kenney is flat low-poly. Pick one style per scene (recommended: Kenney only — closest to the WareTrack look and ~80 KB total).

### Option A — recommended set and budget

| Item | Pick | Raw KB | Meshopt KB |
| --- | --- | ---: | ---: |
| Floor | Kenney `floor` | 12.1 | 4.7 |
| Walls | Kenney `wall`, `wall-window`, `column` | 62.5 | 19.4 |
| Rack per collection | Kenney `shelf-end` + `shelf-boxes` | 108.9 | 25.8 |
| Piece | Kenney `cardboardBoxClosed` (instanced) | 4.8 | 3.5 |
| Counter | Kenney `kitchenBar` + `cash-register` | 33.4 | 12.0 |
| Shelves | Kenney `bookcaseOpen` | 17.3 | 4.2 |
| Plants | Kenney `pottedPlant` + `plantSmall1` | 14.3 | 9.2 |
| Rug | Kenney `rugRectangle` | 2.7 | 3.2 |
| **Total** | | **≈ 256 KB** | **≈ 82 KB** |

Photoreal variant (rack → Steel Frame Shelves 01, shelves → Wooden Display Shelves 01, counter → Classic Console 01, plant → Potted Plant 04): **≈ 4.99 MB raw / ≈ 1.13 MB Meshopt** — right at the budget raw, so it must ship compressed.

## Option B — Sketchfab CC-BY 4.0 (+ CC0 base)

Every row: Sketchfab page opened, licence shown as "CC Attribution" (Creative Commons Attribution 4.0, `http://creativecommons.org/licenses/by/4.0/`), `isDownloadable: true`, no `noai` tag and no NC/ND/editorial wording in the description (checked through `api.sketchfab.com/v3/models/<uid>`). Screenshots: `licencas/sketchfab-<uid8>-<item>.webp`.

**Download blocker:** Sketchfab only serves the file to an authenticated account (`/v3/models/<uid>/download` → "Authentication credentials were not provided"). Raw sizes come from the API's GLB archive size; compressed sizes are estimates. Phase 2 needs a `SKETCHFAB_API_TOKEN` secret to fetch and measure the real files.

| Item | Model | URL | Author | Faces | Textures | Raw KB | Est. compressed KB | Budget | Screenshot |
| --- | --- | --- | --- | ---: | --- | ---: | ---: | --- | --- |
| Rack | Clothes rack with hanger | <https://sketchfab.com/3d-models/clothes-rack-with-hanger-443cffc140bc403e975ca806192970b0> | neverfollow81 | 444 | 3 × 1K | 1 968 | ~190 | ok compressed; raw 39 % | `sketchfab-443cffc1-rack.webp` |
| Rack | Clothes rack 3D Models (round) | <https://sketchfab.com/3d-models/clothes-rack-3d-models-aab3a10828264cd3b948a4c5338cdff5> | hirreyn | 7 272 | none | 219 | ~65 | ok | `sketchfab-aab3a108-rack.webp` |
| Rack | Wardrobe Rack | <https://sketchfab.com/3d-models/wardrobe-rack-6cf5500314b34485b88e72d9a53b4855> | Khoa Nguyen | 4 141 | 1 × 1K | 1 780 | ~105 | ok | `sketchfab-6cf55003-rack.webp` |
| Rack | Clothing Rack | <https://sketchfab.com/3d-models/clothing-rack-e92bf160790444a6a18aa98fe35295b9> | Darky Vip 3D (tee + hanger by dudecon) | 8 163 | 3 × 1K | 481 | ~250 | ok — credit both authors | `sketchfab-e92bf160-rack.webp` |
| Rack | Metaretail: Gondola Rack Clothing | <https://sketchfab.com/3d-models/metaretail-gondola-rack-clothing-bbf6f986cf3b4e12938b42e03464ec6f> | Roberto Domínguez | 5 872 | 4 × 2K | 1 189 | ~290 | ok | `sketchfab-bbf6f986-rack.webp` |
| Hanger | Hangers and Tee-shirt (5 hangers) | <https://sketchfab.com/3d-models/hangers-and-tee-shirt-44e260855c7f4c1ca611af8d2370195a> | dudecon | 4 323 | 1 × 1K | 339 | ~100 | ok | `sketchfab-44e26085-hanger.webp` |
| Hanger | Hangers and Long Sleeve Shirt | <https://sketchfab.com/3d-models/hangers-and-long-sleeve-shirt-14cc81980a06473a820f811596418fae> | dudecon | 3 676 | 1 × 1K | 428 | ~95 | ok | `sketchfab-14cc8198-hanger.webp` |
| Hanger | Wood Clothes Hanger | <https://sketchfab.com/3d-models/wood-clothes-hanger-3b5ada364d634aa18007f9c8d8dc79ce> | ROH3D | 1 128 | 3 × 2K | 7 265 | ~190 | ⚠ raw alone > 5 MB — only usable after downscaling textures; prefer dudecon hangers | `sketchfab-3b5ada36-hanger.webp` |
| Hanger | Metal Hanger | <https://sketchfab.com/3d-models/metal-hanger-640d6af289154623b63e4b01ffce8573> | RED2000 | 10 448 | 2 × 4K | 444 | ~210 | ⚠ 10k faces per hanger × every piece (instanced) is too heavy — prefer dudecon hangers | `sketchfab-640d6af2-hanger.webp` |
| Mannequin | Store mannequin | <https://sketchfab.com/3d-models/store-mannequin-a404eb4a7297442d8168004cae1568ee> | A-in Architecture | 2 806 | 1 × 128 | 118 | ~30 | ok | `sketchfab-a404eb4a-mannequin.webp` |
| Mannequin | Mannequin Female Torso Stand | <https://sketchfab.com/3d-models/mannequin-female-torso-stand-2c40edfc236141a3b320f46e08984a91> | Patrick Matthew | 2 782 | 3 × 1K | 4 629 | ~205 | ⚠ raw 93 % of the budget — use Store mannequin | `sketchfab-2c40edfc-mannequin.webp` |
| Counter | Store Counter (untextured) | <https://sketchfab.com/3d-models/store-counter-c160eb255df34ad581c62b4dbc1ba9f8> | VoidLance | 422 | none | 31 | ~5 | ok | `sketchfab-c160eb25-counter.webp` |
| Counter | Caisse-enregistreuse | <https://sketchfab.com/3d-models/caisse-enregistreuse-4d64359fffbe421c8b6ff8a1d852b607> | codepromo | 1 087 | none | 82 | ~12 | ok | `sketchfab-4d64359f-counter.webp` |
| Shelves | shelves Display 2x2 | <https://sketchfab.com/3d-models/shelves-display-2x2-35a6444fd88b4697b770b95663c5c49f> | Wans.Setiabudi | 1 390 | none | 86 | ~15 | ok | `sketchfab-35a6444f-shelves.webp` |
| Shelves | Metal Display Cabinet | <https://sketchfab.com/3d-models/metal-display-cabinet-278d34271be24efba889ea38e3bf9dd6> | Nobby76 | 5 328 | 3 × 1K | 708 | ~225 | ok | `sketchfab-278d3427-shelves.webp` |
| Shelves | Modular Shelves | <https://sketchfab.com/3d-models/modular-shelves-ae4e079225ee4982b61b048ea4c1081a> | billionlioe | 6 156 | 6 × 1K | 3 213 | ~415 | ⚠ raw 64 % — use shelves Display 2x2 | `sketchfab-ae4e0792-shelves.webp` |
| Plant | Potted Plant, Mediterranean med leaf, low poly | <https://sketchfab.com/3d-models/potted-plant-mediterranean-med-leaf-low-poly-bc7f26baef2a45d18dbd9a5d6d2ec565> | dudecon | 533 | 1 × 512 | 233 | ~30 | ok | `sketchfab-bc7f26ba-plant.webp` |
| Plant | Potted Plant, Mediterranean flowering, low poly | <https://sketchfab.com/3d-models/potted-plant-mediterranean-flowering-low-poly-b8950690664342a497154a8ad2787566> | dudecon | 1 495 | 2 × 512 | 286 | ~60 | ok | `sketchfab-b8950690-plant.webp` |
| Plant | Optimized Potted Plants | <https://sketchfab.com/3d-models/optimized-potted-plants-967b4bf23fac4098993776fcfc2d3318> | Nicholas-3D | 1 770 | 3 × 1K | 2 060 | ~210 | ⚠ raw 41 % — use dudecon plants | `sketchfab-967b4bf2-plant.webp` |
| Floor + walls | Modular Interior Blocks – Stylized Wooden Kit | <https://sketchfab.com/3d-models/modular-interior-blocks-stylized-wooden-kit-dbfb9f6f2c6c4916bdfcdf184ee6746c> | Hermit1_CG | 19 266 | 9 × 2K | 10 006 | ~710 | ⚠ raw 2× the budget, medieval style — use Kenney floor/walls | `sketchfab-dbfb9f6f-floor-walls.webp` |
| Floor | Floor Tile Material | <https://sketchfab.com/3d-models/floor-tile-material-138cae75f1cd45ffb2bca47ca4fae3ea> | YIK | 2 | 3 × 2K | 15 113 | ~180 | ⚠ raw 3× the budget for a single quad — use Kenney `floor` | `sketchfab-138cae75-floor.webp` |

Floor and walls in option B: no Sketchfab candidate fits the budget, so option B reuses the Kenney CC0 floor/walls/column rows from option A.

### Option B — recommended set and budget

| Item | Pick | Raw KB | Compressed KB |
| --- | --- | ---: | ---: |
| Floor + walls | Kenney `floor`, `wall`, `wall-window`, `column` (CC0) | 74.6 | 24.1 (measured) |
| Rack per collection | Clothes rack with hanger — neverfollow81 | 1 968 | ~186 |
| Piece | Hangers and Tee-shirt — dudecon (one hanger, instanced) | 339 | ~99 |
| Mannequin | Store mannequin — A-in Architecture | 118 | ~27 |
| Counter | Store Counter — VoidLance + Caisse-enregistreuse — codepromo | 113 | ~17 |
| Shelves | shelves Display 2x2 — Wans.Setiabudi | 86 | ~13 |
| Plants | dudecon med leaf + flowering | 519 | ~85 |
| **Total** | | **≈ 3.2 MB** | **≈ 0.45 MB (estimate)** |

### Credits required for option B (Créditos screen)

Each CC-BY model used must show: model name linked to its Sketchfab URL, author linked to their profile, "CC BY 4.0" linked to <https://creativecommons.org/licenses/by/4.0/>, and "modified (compressed, textures resized)". Profiles: neverfollow81 <https://sketchfab.com/neverfollow81>, hirreyn <https://sketchfab.com/hradadiya0>, Khoa Nguyen <https://sketchfab.com/ngdkh>, Darky Vip 3D <https://sketchfab.com/darky.vip21>, Roberto Domínguez <https://sketchfab.com/vmmaniac>, dudecon <https://sketchfab.com/dudecon>, ROH3D <https://sketchfab.com/roh3d>, RED2000 <https://sketchfab.com/RED2000>, A-in Architecture <https://sketchfab.com/ainarchi>, Patrick Matthew <https://sketchfab.com/patrickmatthew>, VoidLance <https://sketchfab.com/VoidLance>, codepromo <https://sketchfab.com/codepromo>, Wans.Setiabudi <https://sketchfab.com/Wans.Setiabudi>, Nobby76 <https://sketchfab.com/nobbyt76>, billionlioe <https://sketchfab.com/billionlioe>, Nicholas-3D <https://sketchfab.com/Nicholas01>, Hermit1_CG <https://sketchfab.com/victorbaibakov>, YIK <https://sketchfab.com/Ykc>.
