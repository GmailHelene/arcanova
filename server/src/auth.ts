import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret";
if (JWT_SECRET === "dev-insecure-secret") {
  console.warn("WARNING: JWT_SECRET is not set — using an insecure dev default.");
}

export interface AuthedRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not signed in" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

function publicUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
  };
}

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  const { username, email, password, displayName } = req.body ?? {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  try {
    const hash = await bcrypt.hash(String(password), 10);
    const result = await query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, display_name`,
      [username, email, hash, displayName || username]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Username or email is already taken" });
    }
    console.error(err);
    res.status(500).json({ error: "Could not create account" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const { login, password } = req.body ?? {};
  if (!login || !password) {
    return res.status(400).json({ error: "login and password are required" });
  }
  try {
    const result = await query(
      `SELECT * FROM users WHERE username = $1 OR email = $1`,
      [login]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ error: "Wrong username or password" });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not sign in" });
  }
});

authRouter.get("/me", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const result = await query(
    `SELECT id, username, email, display_name FROM users WHERE id = $1`,
    [req.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(result.rows[0]) });
});
