# 3D sources — `/admin/3d`

`/admin/3d` ships the Sketchfab stockroom (formerly "option B") by default; `?sketchfab=1` and `?cc0=1` are aliases for it and `?atelier=1` opens the previous atelier. The CC0-only "option A" scene was removed when Gabriel picked B. Rejected candidates live in [`REMOVIDOS.md`](REMOVIDOS.md).

Forbidden everywhere: NC, ND, Editorial, NoAI. CC-BY rows require the in-app **Créditos** screen (author, model link, licence link, what was modified); its button sits in the fixed bottom bar of the scene.

## Shipped scene — licences (re-verified 2026-10-14)

Every Sketchfab model was checked twice: the `meta.json` delivered with it in `sketchfab-b.zip` and the live API `https://api.sketchfab.com/v3/models/<uid>`. Both give `license.slug: "by"`, label "CC Attribution", URL `http://creativecommons.org/licenses/by/4.0/` and requirements "Author must be credited. Commercial use is allowed."; the API also gives `isDownloadable: true` and no `noai` tag. The API fields are saved in [`licencas/sketchfab-api-2026-10-14.json`](licencas/sketchfab-api-2026-10-14.json). **No model is NC, ND or non-commercial, so no swap was needed.**

| Used for | Model | Author | URL | Licence | Modifications |
| --- | --- | --- | --- | --- | --- |
| Wall rails | Clothes rack with hanger | [neverfollow81](https://sketchfab.com/neverfollow81) | <https://sketchfab.com/3d-models/clothes-rack-with-hanger-443cffc140bc403e975ca806192970b0> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px; one of the two finishes kept; wire hanger removed |
| Hanger per piece | Hangers and Tee-shirt | [dudecon](https://sketchfab.com/dudecon) | <https://sketchfab.com/3d-models/hangers-and-tee-shirt-44e260855c7f4c1ca611af8d2370195a> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px; only the wooden hanger kept (other hangers and the tee removed) |
| Mannequins | Store mannequin | [A-in Architecture](https://sketchfab.com/ainarchi) | <https://sketchfab.com/3d-models/store-mannequin-a404eb4a7297442d8168004cae1568ee> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px |
| Counter | Store Counter | [VoidLance](https://sketchfab.com/VoidLance) | <https://sketchfab.com/3d-models/store-counter-c160eb255df34ad581c62b4dbc1ba9f8> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px |
| Register | Caisse-enregistreuse | [codepromo](https://sketchfab.com/codepromo) | <https://sketchfab.com/3d-models/caisse-enregistreuse-4d64359fffbe421c8b6ff8a1d852b607> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px |
| Corner display | shelves Display 2x2 | [Wans.Setiabudi](https://sketchfab.com/Wans.Setiabudi) | <https://sketchfab.com/3d-models/shelves-display-2x2-35a6444fd88b4697b770b95663c5c49f> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px; floor base removed |
| Plants | Potted Plant, Mediterranean med leaf, low poly | [dudecon](https://sketchfab.com/dudecon) | <https://sketchfab.com/3d-models/potted-plant-mediterranean-med-leaf-low-poly-bc7f26baef2a45d18dbd9a5d6d2ec565> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px |
| Plant | Potted Plant, Mediterranean flowering, low poly | [dudecon](https://sketchfab.com/dudecon) | <https://sketchfab.com/3d-models/potted-plant-mediterranean-flowering-low-poly-b8950690664342a497154a8ad2787566> | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Meshopt, WebP ≤ 1024 px |
| Floor tiles | `floor.glb` (Mini Market) | Kenney | <https://kenney.nl/assets/mini-market> | CC0 1.0 | Meshopt, WebP ≤ 512 px |
| Walls | `wall.glb` (Furniture Kit) | Kenney | <https://kenney.nl/assets/furniture-kit> | CC0 1.0 | Meshopt, WebP ≤ 512 px |
| Windows | `wallWindow.glb` (Furniture Kit) | Kenney | <https://kenney.nl/assets/furniture-kit> | CC0 1.0 | Meshopt, WebP ≤ 512 px |
| Area rugs | `rugRectangle.glb` (Furniture Kit) | Kenney | <https://kenney.nl/assets/furniture-kit> | CC0 1.0 | Meshopt, WebP ≤ 512 px; tinted per collection at runtime |

Kenney licence: both kit pages read "Creative Commons CC0" and the `License.txt` in each zip says the same (`licencas/kenney-furniture-kit.webp`, `licencas/kenney-mini-market.webp`). CC0 needs no credit; the Créditos screen lists Kenney anyway. The same credits, in Portuguese, are generated into `STOCKROOM_B_CREDITS` (`src/app/scene-engine/stockroom/stockroom-b-assets.ts`) and rendered by the Créditos screen. Per-file sizes are in [`ASSETS.md`](ASSETS.md).

## Size columns

- **Raw** — the `.glb` as obtained. Kenney: the shipped GLB with its external `colormap.png` embedded. Sketchfab candidates: the GLB archive size reported by the Sketchfab API; shipped files: the GLB from `sketchfab-b.zip`.
- **Est. compressed** — for the Sketchfab candidate rows an **estimate** (`~`): geometry × 0.3 plus ~60 KB per 1K WebP map (~20 KB at 512, ~2–6 KB at ≤256). The shipped files are measured in their own table.
- **Budget** — target ≈ 5 MB (5 000 KB) per scene; percentages are of that figure. ⚠ marks a model that alone would take ≥ 40 % of it raw, exceed it, or ship > 1 MB compressed; the alternative is in the note.

## Removed: option A (CC0 only)

Option A (`?cc0=1`, Kenney boxes on bookcases) was retired when Gabriel chose B. Its code and the six Kenney files only it used (`bookcaseOpen`, `cardboardBoxClosed`, `kitchenBar`, `pottedPlant`, `column`, `cash-register`) were deleted; the four Kenney files B reuses stay above. The phase-1 research behind it found no CC0 clothing rail, hanger or mannequin in Poly Haven, Kenney or Sketchfab's CC0 filter, which is why it used boxes as stand-ins. The full candidate tables (Kenney and Poly Haven, all CC0) are in this file's git history.

## Sketchfab CC-BY 4.0 — phase-1 candidates and shipped files

Every row: Sketchfab page opened, licence shown as "CC Attribution" (Creative Commons Attribution 4.0, `http://creativecommons.org/licenses/by/4.0/`), `isDownloadable: true`, no `noai` tag and no NC/ND/editorial wording in the description (checked through `api.sketchfab.com/v3/models/<uid>`). Screenshots: `licencas/sketchfab-<uid8>-<item>.webp`.

Raw and compressed sizes in this phase-1 table come from the API's GLB archive size plus an estimate (Sketchfab only serves the file to an authenticated account). The 8 picks were later delivered as `sketchfab-b.zip` (GLB + `meta.json` each) and measured for real — see **Shipped files** below.

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

Floor and walls: no Sketchfab candidate fits the budget, so the scene uses Kenney CC0 floor, walls and windows.

### Recommended set and budget (phase 1)

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

### Shipped files (default `/admin/3d`)

Source: `sketchfab-b.zip` (8 folders, each `model.glb` + `meta.json` with author, licence and `viewerUrl`). Built by `node scripts/stockroom-sketchfab-assets.mjs <zip|dir>`, which:

1. **Re-checks every licence from `meta.json`** and aborts unless the uid matches the phase-1 pick, `license.slug` is `by`, the licence URL is CC BY 4.0 and `viewerUrl` ends with the uid (no NC / ND / editorial / NoAI can slip in). Unknown folders abort too.
2. **Trims** what the scene does not use (gltf-transform 4.5.1 API): rack — keeps one of the two finishes and drops the wire hanger, then turns it to face the room; hanger — keeps only the wooden hanger (other hangers and the tee removed); shelves — drops the floor base. Then `flatten`, `clearNodeTransform`, `prune`.
3. **Compresses**: `gltf-transform optimize --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --instance false --palette false --join false --flatten false`.
4. Names each file `sketchfab-<folder>.<sha256:8>.glb` (same immutable-cache rule in `public/.htaccess`) and writes `src/assets/3d/stockroom-b/manifest.json` plus `src/app/scene-engine/stockroom/stockroom-b-assets.ts` (URLs + the credits the Créditos screen renders, including what was modified). Output is deterministic — re-running gives the same hashes.

| Shipped file (`src/assets/3d/stockroom-b/`) | Model — author | Used for | Raw KB | Shipped KB |
| --- | --- | --- | ---: | ---: |
| `sketchfab-clothes-rack-with-hanger.fa34f855.glb` | Clothes rack with hanger — neverfollow81 | Two wall rails per bay (6 pieces) | 1 967.7 | 201.9 |
| `sketchfab-hangers-and-tee-shirt.05519b4b.glb` | Hangers and Tee-shirt — dudecon | One wooden hanger per piece (photo card hangs from it) | 339.4 | 4.4 |
| `sketchfab-store-mannequin.2f4a84be.glb` | Store mannequin — A-in Architecture | Two mannequins by the counter | 118.0 | 22.0 |
| `sketchfab-store-counter.4a7b3387.glb` | Store Counter — VoidLance | Counter | 31.3 | 7.3 |
| `sketchfab-caisse-enregistreuse.f9b6d288.glb` | Caisse-enregistreuse — codepromo | Register on the counter | 81.8 | 15.2 |
| `sketchfab-shelves-display-2x2.8f4bdd09.glb` | shelves Display 2x2 — Wans.Setiabudi | Back-corner display | 86.0 | 17.9 |
| `sketchfab-potted-plant-mediterranean-med-leaf-low-poly.b2e85f2f.glb` | Potted Plant, med leaf — dudecon | Plants | 233.4 | 35.9 |
| `sketchfab-potted-plant-mediterranean-flowering-low-poly.fac81565.glb` | Potted Plant, flowering — dudecon | Plant | 285.9 | 43.6 |
| **Sketchfab total (8 files)** | | | **3 143.5** | **348.2** |
| Kenney CC0: `floor`, `wall`, `wallWindow`, `rugRectangle` | Kenney | Floor, walls, windows, area rugs, partitions | 26.9 | 19.1 |
| **Scene total** | | | **≈ 3.1 MB** | **≈ 367 KB** (7 % of the 5 MB budget) |

Measured KB = bytes / 1024; `stockroom-kit-sketchfab.spec.ts` sums both manifests for the kit's files and fails above 5 000 000 bytes. The phase-1 estimate (≈ 0.45 MB) was close; the hanger came in far lighter than estimated (4.4 KB vs ~99) because only the wooden hanger is kept. Product photos stream through the existing thumb pipeline and are not part of this budget.

### Credits required (Créditos screen)

Each CC-BY model used must show: model name linked to its Sketchfab URL, author linked to their profile, "CC BY 4.0" linked to <https://creativecommons.org/licenses/by/4.0/>, and "modified (compressed, textures resized)". Profiles: neverfollow81 <https://sketchfab.com/neverfollow81>, hirreyn <https://sketchfab.com/hradadiya0>, Khoa Nguyen <https://sketchfab.com/ngdkh>, Darky Vip 3D <https://sketchfab.com/darky.vip21>, Roberto Domínguez <https://sketchfab.com/vmmaniac>, dudecon <https://sketchfab.com/dudecon>, ROH3D <https://sketchfab.com/roh3d>, RED2000 <https://sketchfab.com/RED2000>, A-in Architecture <https://sketchfab.com/ainarchi>, Patrick Matthew <https://sketchfab.com/patrickmatthew>, VoidLance <https://sketchfab.com/VoidLance>, codepromo <https://sketchfab.com/codepromo>, Wans.Setiabudi <https://sketchfab.com/Wans.Setiabudi>, Nobby76 <https://sketchfab.com/nobbyt76>, billionlioe <https://sketchfab.com/billionlioe>, Nicholas-3D <https://sketchfab.com/Nicholas01>, Hermit1_CG <https://sketchfab.com/victorbaibakov>, YIK <https://sketchfab.com/Ykc>.
