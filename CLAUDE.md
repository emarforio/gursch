# Gursch scorekeeper

- `PLAN.md` is the project plan: stack, architecture, data model, screens and milestones. Follow it, and update it when a decision changes.
- `RULES.md` is the source of truth for the game rules and is rendered by the app's rules page. Keep it written for players, not developers.
- Game logic lives in `src/domain/` as pure TypeScript with unit tests. No React or Firebase imports there.
