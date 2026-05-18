import { Router, Request, Response } from "express";
import { query } from "./db";

export const usersRouter = Router();

// Public profile: a creator and the worlds they have published.
usersRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(404).json({ error: "User not found" });
  }

  const userResult = await query(
    `SELECT id, username, display_name, created_at FROM users WHERE id = $1`,
    [userId],
  );
  if (!userResult.rows[0]) return res.status(404).json({ error: "User not found" });

  const games = await query(
    `SELECT g.id, g.title, g.description, g.plays,
            COUNT(DISTINCT l.user_id)::int AS like_count
       FROM games g
       LEFT JOIN likes l ON l.game_id = g.id
      WHERE g.creator_id = $1 AND g.published = true AND g.hidden = false
      GROUP BY g.id
      ORDER BY g.created_at DESC`,
    [userId],
  );

  res.json({ user: userResult.rows[0], games: games.rows });
});
