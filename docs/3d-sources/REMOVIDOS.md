# 3D sources — rejected candidates

Candidates evaluated on 2026-10-14 and rejected, with the reason. Accepted models are in [`FONTES.md`](FONTES.md).

## Licence problems

| Candidate | Source | Licence found | Reason | Evidence |
| --- | --- | --- | --- | --- |
| clothes hangers — Sousinho | <https://sketchfab.com/3d-models/clothes-hangers-999d17921fdd4ee7bb9c0901e660c88e> | CC-BY + **`noai` tag** | NoAI is forbidden. | `licencas/sketchfab-999d1792-hanger.webp`, API tag `noai` |
| Quaternius — Ultimate House Interior Pack (all 14 shortlisted models below) | <https://quaternius.com/packs/ultimatehomeinterior.html>, mirror <https://opengameart.org/content/lowpoly-house-interior-pack> | Pack page and OpenGameArt say **CC0**, but <https://quaternius.com/license.html> now publishes the **Quaternius Asset License (QAL) v1.0** (updated 2026-08-28): custom licence, no redistribution of the assets as assets, and it defines Assets "regardless of the specific site or platform through which they were obtained". | Conflicting licence statements, and QAL is not CC0, so it fails option A's CC0-only rule. Kenney covers every role these models filled. Revisit only if Quaternius confirms in writing that the June 2020 pack stays CC0. | `licencas/quaternius-ultimate-house-interior.webp`, `licencas/quaternius-license.webp`, `licencas/opengameart-quaternius-house-interior.webp` |
| "CC0 - Shirt On Hanger", "CC0 - Hanger 3", "CC0 - Coat Hanger", "CC0 - Coat Rack 3" — plaggy | <https://sketchfab.com/3d-models/846d8f285fcb426498033ae67aee2d10>, <https://sketchfab.com/3d-models/3bf2dd8224ee42e8ac9b77033e604d15>, <https://sketchfab.com/3d-models/ac64f37d1ece47f99fe5b50fdba1b1cf>, <https://sketchfab.com/3d-models/0d27167d172443a895670a41375f44db> | Title says CC0, Sketchfab licence field says **CC Attribution** | Conflicting licence statements, and every file is far over budget (12.3–70.9 MB GLB, 4K textures). | Sketchfab API `license.label` |
| clothing-rack — Mo.Dular (×2), c.nv.s clothing rack — roisinmullins, clothing-rack — Sflex | <https://sketchfab.com/3d-models/e3749c18f9834667b9c77744f2d4273d>, <https://sketchfab.com/3d-models/b5aeb89e45fe4d3d9507edc3a40f2319>, <https://sketchfab.com/3d-models/5737aebbde074925bf78df47c54f2088>, <https://sketchfab.com/3d-models/775375ae59be45dc9d7dcde1bc87a07f> | CC-BY | The same mesh (14 100–14 212 faces, ~869 KB) is uploaded by four accounts. The original author can't be established, so a correct CC-BY credit is impossible. | Sketchfab API face count and archive size |

### Quaternius models rejected with the pack (measured before rejection)

OBJ converted to GLB with `obj2gltf`, then measured like the `FONTES.md` rows.

| Item | Model | Tris | Raw KB | Meshopt KB | Draco KB |
| --- | --- | ---: | ---: | ---: | ---: |
| Plant | Houseplant_1 | 245 | 9.6 | 6.3 | 4.4 |
| Plant | Houseplant_3 | 412 | 21.4 | 10.2 | 6.1 |
| Plant | Houseplant_5 | 492 | 19.4 | 9.2 | 5.6 |
| Plant | Houseplant_7 | 449 | 15.4 | 7.9 | 5.6 |
| Shelves | Shelf_Large | 220 | 12.2 | 4.2 | 1.9 |
| Shelves | Shelf_1 | 96 | 6.2 | 3.0 | 1.5 |
| Shelves | Shelf_Small1 | 132 | 7.6 | 3.3 | 1.7 |
| Shelves | Drawer_1 | 404 | 13.2 | 6.9 | 4.4 |
| Shelves | Drawer_3 | 604 | 26.0 | 9.0 | 4.6 |
| Counter | Kitchen_3Drawers | 212 | 11.5 | 6.2 | 3.7 |
| Counter | Kitchen_Cabinet1 | 68 | 4.9 | 3.8 | 2.4 |
| Wall / column | Column_SquareBig | 180 | 9.0 | 3.9 | 2.0 |
| Rug | Carpet_1 | 108 | 5.2 | 4.0 | 2.8 |
| Lamp | Light_Floor1 | 226 | 9.0 | 5.8 | 3.9 |

## Budget / performance

| Candidate | Source | Licence | Size | Reason | Lighter alternative |
| --- | --- | --- | --- | --- | --- |
| Potted Plant 01 — Rico Cilliers | <https://polyhaven.com/a/potted_plant_01> | CC0 | 6 173.8 KB raw / 1 729.6 KB Meshopt / 1 150.4 KB Draco, 176 226 tris | Over the whole 5 MB budget raw and a third of it compressed, for one prop seen from above. | Kenney `pottedPlant` (6.7 KB) or Poly Haven Potted Plant 04 |
| Potted Plant 02 — Rico Cilliers | <https://polyhaven.com/a/potted_plant_02> | CC0 | 2 570.5 KB raw / 872.3 KB Meshopt, 69 806 tris | Half the budget raw; 70k tris for a decorative plant. | Kenney `plantSmall1` |
| Vintage Cabinet 01 — Rico Cilliers | <https://polyhaven.com/a/vintage_cabinet_01> | CC0 | 2 794.0 KB raw / 739.2 KB Meshopt, 61 096 tris | Heavy for a background shelf. | Poly Haven Wooden Display Shelves 01 (165 KB) |
| Monstera Deliciosa Potted Mid-Century plant — Giora | <https://sketchfab.com/3d-models/monstera-deliciosa-potted-mid-century-plant-1ab9bf841df04c07b1819be596327629> | CC-BY | 85 809 KB GLB, 9 × 4K textures | 17× the scene budget. | dudecon Mediterranean potted plants (233–286 KB) |
| Clothing Rack — RDS-za | <https://sketchfab.com/3d-models/306d0613927f40e7b5f13290c9768789> | CC-BY | 77 377 KB GLB, 4K textures | 15× the budget. | neverfollow81 Clothes rack with hanger |
| Clothing rack with accessories — paragguacentvi | <https://sketchfab.com/3d-models/e79d3fce79754fc4ab9be35b1ad0c92d> | CC-BY | 39 831 KB GLB, 499 996 faces | 8× the budget, half a million faces. | neverfollow81 Clothes rack with hanger |

Screenshots for the Poly Haven rows and the Monstera are in `licencas/` (`polyhaven-potted_plant_01.webp`, `polyhaven-potted_plant_02.webp`, `polyhaven-vintage_cabinet_01.webp`, `sketchfab-1ab9bf84-plant.webp`).

## Sources that could not be used

- **Poly Pizza** (Quaternius GLB mirror): behind a Cloudflare challenge that blocks both curl and headless Chrome. Moot after the Quaternius rejection.
- **Quaternius Google Drive**: every file returned "Quota exceeded" from this environment; the pack was obtained from the OpenGameArt mirror instead.
- **Sketchfab CC0 filter**: no clothing rack, hanger or mannequin results, so option A has no CC0 garment rail or hanger.
