# Agent 5 — Gap audit — delivered

**Model:** Claude Sonnet 5 Thinking (orchestrator)

## Deliverables

- [`docs/feature-gap-backlog.md`](../feature-gap-backlog.md) — G1–G14 with priority + model
- [`docs/agent-briefs/feature-gaps.md`](./feature-gaps.md) — dispatch prompts

## Navigation notes (verified in code)

| Surface | Status |
|---------|--------|
| Landing / About / PLP / PDP | OK |
| Cart drawer | Checkout wired to Stripe |
| Favoritos / Auth pages | OK |
| Footer legal | Still stubs → **G1** |
| Search / Account icons | Account linked; search still stub → **G8** |
| Newsletter | UI only → **G7** |
| Mega Masculino/Jóia/Arte/Casa | Em breve → **G6** |

## Next feature agents to spawn

1. **G1** Composer — legal pages  
2. **G7** Composer — newsletter API  
3. **G8** Sonnet — search  
4. **G13** Opus — prod `apiBaseUrl` before deploy  
