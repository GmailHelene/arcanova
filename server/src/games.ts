import { Router, Request, Response } from "express";
import { query } from "./db";
import { authMiddleware, optionalAuth, AuthedRequest } from "./auth";

export const gamesRouter = Router();

// List published games for the Discover page, with search and sorting.
gamesRouter.get("/", optionalAuth, async (req: AuthedRequest, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sort = req.query.sort;
  const orderBy =
    sort === "plays" ? "g.plays DESC" :
    sort === "likes" ? "like_count DESC" :
    "g.created_at DESC";
  const result = await query(
    `SELECT g.id, g.title, g.description, g.plays, g.created_at, g.creator_id,
            u.display_name AS creator,
            COUNT(DISTINCT l.user_id)::int AS like_count,
            COALESCE(BOOL_OR(l.user_id = $2), false) AS liked_by_me
       FROM games g
       JOIN users u ON u.id = g.creator_id
       LEFT JOIN likes l ON l.game_id = g.id
      WHERE g.published = true
        AND ($1 = '' OR g.title ILIKE '%' || $1 || '%')
      GROUP BY g.id, u.display_name
      ORDER BY ${orderBy}
      LIMIT 60`,
    [search, req.userId ?? 0]
  );
  res.json({ games: result.rows });
});

// Games created by the signed-in user (Profile / Create page).
gamesRouter.get("/mine", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const result = await query(
    `SELECT id, title, description, plays, published, updated_at
       FROM games WHERE creator_id = $1 ORDER BY updated_at DESC`,
    [req.userId]
  );
  res.json({ games: result.rows });
});

// Featured worlds for the top of the Discover page — the most-liked worlds.
// Defined before "/:id" so the path is not captured as a game id.
gamesRouter.get("/featured", async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT g.id, g.title, g.description, g.plays, g.creator_id,
            u.display_name AS creator,
            COUNT(DISTINCT l.user_id)::int AS like_count
       FROM games g
       JOIN users u ON u.id = g.creator_id
       JOIN likes l ON l.game_id = g.id
      WHERE g.published = true
      GROUP BY g.id, u.display_name
      ORDER BY like_count DESC, g.plays DESC
      LIMIT 3`
  );
  res.json({ games: result.rows });
});

// A single game with its full definition (used by the play runtime).
gamesRouter.get("/:id", optionalAuth, async (req: AuthedRequest, res: Response) => {
  const result = await query(
    `SELECT g.id, g.title, g.description, g.definition, g.plays, g.published,
            g.creator_id, u.display_name AS creator,
            COUNT(DISTINCT l.user_id)::int AS like_count,
            COALESCE(BOOL_OR(l.user_id = $2), false) AS liked_by_me
       FROM games g
       JOIN users u ON u.id = g.creator_id
       LEFT JOIN likes l ON l.game_id = g.id
      WHERE g.id = $1
      GROUP BY g.id, u.display_name`,
    [req.params.id, req.userId ?? 0]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Game not found" });
  res.json({ game: result.rows[0] });
});

// Create a new game (starts as an unpublished draft).
gamesRouter.post("/", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const { title, description, definition } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });
  const result = await query(
    `INSERT INTO games (creator_id, title, description, definition)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, description, definition, published`,
    [req.userId, title, description || "", definition || {}]
  );
  res.status(201).json({ game: result.rows[0] });
});

// Update a game's content or publish state. Only the creator may do this.
gamesRouter.put("/:id", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const owned = await query(`SELECT creator_id FROM games WHERE id = $1`, [req.params.id]);
  if (!owned.rows[0]) return res.status(404).json({ error: "Game not found" });
  if (owned.rows[0].creator_id !== req.userId) {
    return res.status(403).json({ error: "This is not your game" });
  }
  const { title, description, definition, published } = req.body ?? {};
  const result = await query(
    `UPDATE games
        SET title       = COALESCE($2, title),
            description = COALESCE($3, description),
            definition  = COALESCE($4, definition),
            published   = COALESCE($5, published),
            updated_at  = now()
      WHERE id = $1
      RETURNING id, title, description, definition, published`,
    [req.params.id, title ?? null, description ?? null, definition ?? null, published ?? null]
  );
  res.json({ game: result.rows[0] });
});

// Delete a game. Only the creator may do this. Scores cascade automatically.
gamesRouter.delete("/:id", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const owned = await query(`SELECT creator_id FROM games WHERE id = $1`, [req.params.id]);
  if (!owned.rows[0]) return res.status(404).json({ error: "Game not found" });
  if (owned.rows[0].creator_id !== req.userId) {
    return res.status(403).json({ error: "This is not your game" });
  }
  await query(`DELETE FROM games WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// Record a score for a game's leaderboard.
gamesRouter.post("/:id/scores", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const score = Number(req.body?.score);
  if (!Number.isFinite(score)) return res.status(400).json({ error: "score must be a number" });
  await query(
    `INSERT INTO scores (game_id, user_id, score) VALUES ($1, $2, $3)`,
    [req.params.id, req.userId, Math.round(score)]
  );
  await query(`UPDATE games SET plays = plays + 1 WHERE id = $1`, [req.params.id]);
  res.status(201).json({ ok: true });
});

// Like a game.
gamesRouter.post("/:id/like", authMiddleware, async (req: AuthedRequest, res: Response) => {
  await query(
    `INSERT INTO likes (game_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [req.params.id, req.userId]
  );
  res.json({ ok: true });
});

// Remove a like.
gamesRouter.delete("/:id/like", authMiddleware, async (req: AuthedRequest, res: Response) => {
  await query(
    `DELETE FROM likes WHERE game_id = $1 AND user_id = $2`,
    [req.params.id, req.userId]
  );
  res.json({ ok: true });
});

// Top scores for a game.
gamesRouter.get("/:id/scores", async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.score, s.created_at, u.display_name AS player
       FROM scores s
       JOIN users u ON u.id = s.user_id
      WHERE s.game_id = $1
      ORDER BY s.score DESC
      LIMIT 20`,
    [req.params.id]
  );
  res.json({ scores: result.rows });
});
