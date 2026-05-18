# Arcanova roadmap

## Vision

A platform where players build, share, play and compete on their own game worlds.
The heart of it is the **creation loop**: build a world → publish it → others play it
and compete on the leaderboard.

The full long-term vision (competition, creator economy, social hub, AI features,
esports) lives in `VISION.md`. This roadmap is deliberately leaner — it is the
ordered, achievable path toward that vision, not the dream itself.

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

### Phase 2 — A richer platformer ✅ Done
- ✅ Bouncer and one-way platform tiles
- ✅ Sound effects (jump, coin, bounce, death, win)
- ✅ Moving platforms (horizontal + vertical)
- ✅ World themes (Twilight, Jungle, Space, Cave, Snow, Lava)
- ✅ Bigger, scrolling levels (camera follows the player)
- ✅ Background music (with an on/off toggle)
- ✅ Mobile / touch controls — on-screen move/jump buttons on touch devices

### Phase 3 — Discovery & social ✅ Done
- ✅ Likes / favourites
- ✅ Discover page: search + sort (newest, most played, most liked)
- ✅ Share links for individual worlds
- ✅ Player profiles showing their published worlds
- ✅ Featured worlds (currently the most-liked worlds; hand-curated
  featuring will come once admin tooling exists in Phase 4)

### Phase 4 — Safety by design ✅ Done
The platform is kept safe by design, not by heavy moderation: no voice
chat, no free-form chat (preset phrases + reactions only), no real-money
payouts. That kept this phase small and buildable:
- ✅ Report button on worlds
- ✅ Admin role with a review queue
- ✅ Hide / unhide reported content
- ✅ Preset-message + reaction system (replaces free-form chat)

### Phase 5 — Online & multiplayer ✅ Done — core goal
Built on persistent websocket connections (a key reason the stack runs on
Railway rather than a serverless host).
- ✅ Live presence — players in the same world see each other move in real time
- ✅ Smoother peer movement (position interpolation)
- ✅ Co-op mechanics — buttons and gates (any player on a button opens gates)
- ✅ Anti-cheat — scores validated against each world's maximum possible score
- Deferred: full server-authoritative netcode (running the whole engine
  server-side). A multi-week rebuild with ongoing server cost — worth it
  only if competitive play becomes central. Not part of committed scope.

### Phase 6 — Beyond 🔄 In progress
- ✅ Creator recognition — badges on profiles (First World, Prolific,
  Crowd-Pleaser, Beloved), derived from a creator's stats
- ✅ Second world type — top-down arena (walls, gems, enemies, exit),
  with live multiplayer presence. Worlds are tagged with a `kind`; the
  editor and runtime adapt.
- ⬜ More world types (maze/quest)
- ⬜ Events

## Technical hardening

Tech debt, tracked separately from the feature phases.

Done:
- Rate-limiting on login / register
- CORS restricted to a configured origin (was fully open)
- Score submissions bounded — absurd / negative values are rejected
- Linting + formatting (ESLint + Prettier)
- Automated tests (Vitest) + CI that runs lint, tests and build on every push
- Real DB migrations — ordered, transactional, tracked in schema_migrations
- Auth token in an httpOnly, SameSite=Strict cookie (was localStorage)

Pending:
- (nothing outstanding — see the deferred item under Phase 5)

Decided against:
- Email verification — does not fit a young audience (many kids have no
  email of their own). The real future need is a **parental-consent
  flow**, a legal-grounded feature for a later phase.

## Changelog

- **2026-05-18** — Phase 6: live multiplayer presence added to arena worlds.
- **2026-05-18** — Phase 6: top-down arena world type (a second world
  kind) — walls, gems, enemies and an exit, with its own editor and runtime.
- **2026-05-18** — Phase 6: creator badges on profiles.
- **2026-05-18** — Phase 5 complete: scores validated against each world's
  maximum possible score (proportionate anti-cheat).
- **2026-05-18** — Phase 5: co-op buttons and gates — any player holding a
  button opens the gates for everyone in the world.
- **2026-05-18** — Phase 5: peer positions interpolated for smooth movement.
- **2026-05-18** — Phase 5.1: live presence — a WebSocket server lets
  players in the same world see each other move in real time.
- **2026-05-18** — Auth moved to an httpOnly SameSite=Strict cookie
  (was localStorage); added a logout endpoint.
- **2026-05-18** — DB migrations: ordered, transactional migration runner
  (schema_migrations table) replaces apply-schema-on-startup.
- **2026-05-18** — Tooling: ESLint + Prettier, Vitest test suite, GitHub
  Actions CI (lint + test + build).
- **2026-05-18** — Hardening: auth rate-limiting, CORS restricted,
  score submissions bounded.
- **2026-05-18** — Phase 4 complete: preset reactions on worlds (safe,
  no free-form text).
- **2026-05-18** — Phase 4 started: report button, admin review queue,
  hide/unhide worlds.
- **2026-05-18** — Adopted safe-by-design: virtual-only economy, no voice
  or free-form chat, purpose-built engines. VISION + Phase 4 reshaped.
- **2026-05-18** — Phase 3 complete: featured worlds on Discover.
- **2026-05-18** — Phase 3: public player profiles.
- **2026-05-18** — Phase 3 started: likes, Discover search + sort, share links.
- **2026-05-18** — Phase 2 complete: on-screen touch controls for mobile.
- **2026-05-18** — Phase 2: background music with an on/off toggle.
- **2026-05-18** — Phase 2: wider levels (90 tiles) with a scrolling camera.
- **2026-05-18** — Creators can delete their own worlds.
- **2026-05-18** — Phase 2: world themes (6 themes — sky + ground styling).
- **2026-05-18** — Phase 2: moving platforms (horizontal + vertical).
- **2026-05-18** — Phase 2 started: bouncer + one-way platform tiles, sound effects.
- **2026-05-18** — Phase 1 complete: world editor + play runtime + leaderboards.
- **2026-05-18** — Phase 0 complete: scaffold, accounts, database, live on Railway.
