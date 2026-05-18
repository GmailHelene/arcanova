import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { runMigrations } from "./db";
import { authRouter } from "./auth";
import { gamesRouter } from "./games";
import { usersRouter } from "./users";
import { adminRouter } from "./admin";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Railway runs the app behind a proxy; this makes req.ip (used for
// rate-limiting) reflect the real client address.
app.set("trust proxy", 1);

// The client is served from the same origin as the API, so cross-origin
// requests are not needed. Set CLIENT_ORIGIN only if a separate frontend
// host ever needs access.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || false }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "arcanova" }));
app.use("/api/auth", authRouter);
app.use("/api/games", gamesRouter);
app.use("/api/users", usersRouter);
app.use("/api/admin", adminRouter);

// Serve the built React client in production.
const clientDist = path.join(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
} else {
  console.warn("client/dist not found — run `npm run build` for the full app.");
}

async function start() {
  await runMigrations();
  app.listen(PORT, () => console.log(`Arcanova server running on port ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
