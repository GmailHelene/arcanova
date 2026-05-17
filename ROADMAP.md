# Arcanova roadmap

## Vision

A platform where players build, share, play and compete on their own game worlds.
The heart of it is the **creation loop**: build a world → publish it → others play it
and compete on the leaderboard.

## Guiding principle

Build the *real* skeleton of the full platform, then fill it in one room at a time.
Every change is genuine progress on the real product — not a throwaway mini-version,
but also not an attempt to build everything at once. Finish and ship each room before
opening the next.

## Phases

### Phase 0 — Foundation ✅ Done
- Project scaffold: one Node service serving a React client
- Accounts: register / login / sessions (JWT)
- Database: users, games, scores
- Deployed and live on Railway

### Phase 1 — Creation loop ✅ Done
- Shared 2D level format (grid tiles + player start)
- World editor: paint ground / spikes / coins / goal, set start, test, save, publish
- Play runtime: platformer physics, collisions, coins, goal, scoring
- Per-world leaderboards
- Full keyboard control

### Phase 2 — A richer platformer 🔄 In progress
- ✅ Bouncer and one-way platform tiles
- ✅ Sound effects (jump, coin, bounce, death, win)
- ✅ Moving platforms (horizontal + vertical)
- ✅ World themes (Twilight, Jungle, Space, Cave, Snow, Lava)
- ⬜ Bigger or scrollable levels
- ⬜ Background music

### Phase 3 — Discovery & social ⬜ Planned
- Better Discover page: search, sort, featured worlds
- Player profiles showing their published worlds
- Likes / favourites
- Share links for individual worlds

### Phase 4 — Safety & trust ⬜ Planned
- Content moderation for published worlds and usernames
- Age-appropriate account handling
- Reporting and review tools

### Phase 5 — Beyond ⬜ Ideas, not committed
- More world types (top-down arena, maze/quest)
- Real-time / multiplayer
- Creator recognition and events

## Changelog

- **2026-05-18** — Phase 2: world themes (6 themes — sky + ground styling).
- **2026-05-18** — Phase 2: moving platforms (horizontal + vertical).
- **2026-05-18** — Phase 2 started: bouncer + one-way platform tiles, sound effects.
- **2026-05-18** — Phase 1 complete: world editor + play runtime + leaderboards.
- **2026-05-18** — Phase 0 complete: scaffold, accounts, database, live on Railway.
