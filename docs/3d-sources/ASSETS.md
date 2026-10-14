# Arquivos 3D do estoque (opções A e B)

Gerado por `node scripts/stockroom-assets-report.mjs` a partir dos próprios `.glb` (o script lê o
bloco JSON de cada arquivo: `EXT_meshopt_compression` em `extensionsUsed` e imagens `image/webp`).
Tamanhos em KB = bytes / 1024. Limite por arquivo: 2 MB (2048 KB).

| Arquivo | Opção | Chave | Origem | Original (KB) | Enviado (KB) | Meshopt | Texturas WebP | Nome com hash | > 2 MB |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| `kenney-bookcaseOpen.d0e67908.glb` | A | shelf | Kenney (CC0) — Furniture Kit / bookcaseOpen.glb | 17.3 | 4.2 | sim | sem textura | sim | não |
| `kenney-cardboardBoxClosed.5adfdd4e.glb` | A | box | Kenney (CC0) — Furniture Kit / cardboardBoxClosed.glb | 4.8 | 3.5 | sim | sem textura | sim | não |
| `kenney-rugRectangle.4cc6979c.glb` | A, B | rug | Kenney (CC0) — Furniture Kit / rugRectangle.glb | 2.7 | 3.2 | sim | sem textura | sim | não |
| `kenney-wall.96e2bfa0.glb` | A, B | wall | Kenney (CC0) — Furniture Kit / wall.glb | 2.6 | 4.0 | sim | sem textura | sim | não |
| `kenney-wallWindow.58aa64e9.glb` | A, B | wallWindow | Kenney (CC0) — Furniture Kit / wallWindow.glb | 9.5 | 7.2 | sim | sem textura | sim | não |
| `kenney-kitchenBar.b83cd2b9.glb` | A | counter | Kenney (CC0) — Furniture Kit / kitchenBar.glb | 5.3 | 4.6 | sim | sem textura | sim | não |
| `kenney-pottedPlant.9179970a.glb` | A | plant | Kenney (CC0) — Furniture Kit / pottedPlant.glb | 6.7 | 5.1 | sim | sem textura | sim | não |
| `kenney-floor.36468d86.glb` | A, B | floor | Kenney (CC0) — Mini Market / floor.glb | 12.1 | 4.7 | sim | sim (1) | sim | não |
| `kenney-column.95c36be9.glb` | A | column | Kenney (CC0) — Mini Market / column.glb | 26.8 | 6.9 | sim | sim (1) | sim | não |
| `kenney-cash-register.ad5c81ee.glb` | A | register | Kenney (CC0) — Mini Market / cash-register.glb | 28.1 | 7.4 | sim | sim (1) | sim | não |
| `sketchfab-clothes-rack-with-hanger.fa34f855.glb` | B | rail | Sketchfab (CC BY 4.0) — Clothes rack with hanger, neverfollow81 | 1967.7 | 201.9 | sim | sim (3) | sim | não |
| `sketchfab-hangers-and-tee-shirt.05519b4b.glb` | B | hanger | Sketchfab (CC BY 4.0) — Hangers and Tee-shirt, dudecon | 339.4 | 4.4 | sim | sem textura | sim | não |
| `sketchfab-store-mannequin.2f4a84be.glb` | B | mannequin | Sketchfab (CC BY 4.0) — Store mannequin, A-in Architecture | 118.0 | 22.0 | sim | sim (1) | sim | não |
| `sketchfab-store-counter.4a7b3387.glb` | B | counter | Sketchfab (CC BY 4.0) — Store Counter, VoidLance | 31.3 | 7.3 | sim | sem textura | sim | não |
| `sketchfab-caisse-enregistreuse.f9b6d288.glb` | B | register | Sketchfab (CC BY 4.0) — Caisse-enregistreuse, codepromo | 81.8 | 15.2 | sim | sem textura | sim | não |
| `sketchfab-shelves-display-2x2.8f4bdd09.glb` | B | display | Sketchfab (CC BY 4.0) — shelves Display 2x2, Wans.Setiabudi | 86.0 | 17.9 | sim | sem textura | sim | não |
| `sketchfab-potted-plant-mediterranean-med-leaf-low-poly.b2e85f2f.glb` | B | plantLeaf | Sketchfab (CC BY 4.0) — Potted Plant, Mediterranean med leaf, low poly, dudecon | 233.4 | 35.9 | sim | sim (1) | sim | não |
| `sketchfab-potted-plant-mediterranean-flowering-low-poly.fac81565.glb` | B | plantFlower | Sketchfab (CC BY 4.0) — Potted Plant, Mediterranean flowering, low poly, dudecon | 285.9 | 43.6 | sim | sim (2) | sim | não |

- **Opção A** (`?cc0=1`): 10 arquivos, 115.9 KB originais → 50.9 KB enviados.
- **Opção B** (`?sketchfab=1`): 12 arquivos (8 Sketchfab + 4 Kenney reaproveitados: floor, wall, wallWindow, rug), 3170.4 KB originais → 367.3 KB enviados.
- Maior arquivo enviado: `sketchfab-clothes-rack-with-hanger.fa34f855.glb` com 201.9 KB.
- Nenhum arquivo enviado passa de 2 MB.
- Originais acima de 2 MB (decimal) e o que foi feito: `rail` 2.014.920 bytes (2.01 MB / 1.92 MiB) → 201.9 KB com Meshopt + WebP ≤ 1024 px, sem decimação.
- O decodificador Meshopt (`GLTFLoader.setMeshoptDecoder(MeshoptDecoder)`, em `src/app/scene-engine/atelier-assets.ts`) só entra no chunk lazy da rota `/admin/3d`, não no bundle principal.
  Conferido com `ng build --configuration production --stats-json`: `meshopt_decoder.module.js` cai num chunk
  compartilhado importado apenas pelos chunks `stockroom-engine` e `scene-engine`, que o `admin-3d-page` carrega
  com `import()`; ele fica fora do grafo inicial (`main` + `polyfills` e seus imports estáticos).
