import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { query } from "./db";

// Brute-force protection for the credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts — please wait a few minutes." },
});

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

// Like authMiddleware, but never rejects — just sets userId when a valid
// token is present. Used by public endpoints that personalize when signed in.
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number };
      req.userId = payload.userId;
    } catch {
      // Ignore an invalid token on a public route.
    }
  }
  next();
}

function publicUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    isAdmin: !!row.is_admin,
  };
}

// Requires a valid token AND that the user is an admin.
export async function adminMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not signed in" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
  const result = await query(`SELECT is_admin FROM users WHERE id = $1`, [req.userId]);
  if (!result.rows[0]?.is_admin) {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}

export const authRouter = Router();

authRouter.post("/register", authLimiter, async (req: Request, res: Response) => {
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
       RETURNING id, username, email, display_name, is_admin`,
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

authRouter.post("/login", authLimiter, async (req: Request, res: Response) => {
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
    `SELECT id, username, email, display_name, is_admin FROM users WHERE id = $1`,
    [req.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(result.rows[0]) });
});
