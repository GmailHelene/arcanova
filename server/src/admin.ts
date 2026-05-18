import { Router, Request, Response } from "express";
import { query } from "./db";
import { adminMiddleware } from "./auth";

// Every route here requires an admin account.
export const adminRouter = Router();
adminRouter.use(adminMiddleware);

// The review queue: open reports, with the world and who reported it.
adminRouter.get("/reports", async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT r.id, r.reason, r.created_at, r.game_id,
            g.title AS game_title, g.hidden,
            u.display_name AS reporter
       FROM reports r
       JOIN games g ON g.id = r.game_id
       JOIN users u ON u.id = r.reporter_id
      WHERE r.status = 'open'
      ORDER BY r.created_at DESC`,
  );
  res.json({ reports: result.rows });
});

// Worlds currently hidden from the public site.
adminRouter.get("/hidden", async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT g.id, g.title, u.display_name AS creator
       FROM games g
       JOIN users u ON u.id = g.creator_id
      WHERE g.hidden = true
      ORDER BY g.title`,
  );
  res.json({ games: result.rows });
});

// Hide a world from the public site and close its open reports.
adminRouter.post("/games/:id/hide", async (req: Request, res: Response) => {
  await query(`UPDATE games SET hidden = true WHERE id = $1`, [req.params.id]);
  await query(
    `UPDATE reports SET status = 'reviewed' WHERE game_id = $1 AND status = 'open'`,
    [req.params.id],
  );
  res.json({ ok: true });
});

// Make a hidden world public again.
adminRouter.post("/games/:id/unhide", async (req: Request, res: Response) => {
  await query(`UPDATE games SET hidden = false WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// Dismiss a single report without hiding the world.
adminRouter.post("/reports/:id/dismiss", async (req: Request, res: Response) => {
  await query(`UPDATE reports SET status = 'reviewed' WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});
