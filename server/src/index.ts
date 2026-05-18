import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import { initSchema } from "./db";
import { authRouter } from "./auth";
import { gamesRouter } from "./games";
import { usersRouter } from "./users";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "arcanova" }));
app.use("/api/auth", authRouter);
app.use("/api/games", gamesRouter);
app.use("/api/users", usersRouter);

// Serve the built React client in production.
const clientDist = path.join(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
} else {
  console.warn("client/dist not found — run `npm run build` for the full app.");
}

async function start() {
  await initSchema();
  app.listen(PORT, () => console.log(`Arcanova server running on port ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
