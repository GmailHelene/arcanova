import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "./db";

// Seeds a couple of example worlds on first startup, so a brand-new visitor
// sees a lively Discover page instead of an empty one. Runs once: if the
// official "Arcanova" account already has worlds, it does nothing.

// Builds a short, beatable starter platformer (90x18 grid).
function samplePlatformer() {
  const cols = 90;
  const rows = 18;
  const tiles = new Array(cols * rows).fill(0);
  const set = (c: number, r: number, v: number) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) tiles[r * cols + c] = v;
  };
  // Continuous floor (SOLID = 1).
  for (let c = 0; c < cols; c++) set(c, rows - 1, 1);
  // A few raised platforms.
  for (let c = 12; c < 18; c++) set(c, 13, 1);
  for (let c = 26; c < 33; c++) set(c, 10, 1);
  for (let c = 44; c < 52; c++) set(c, 12, 1);
  for (let c = 60; c < 68; c++) set(c, 9, 1);
  // Coins (3) to collect.
  set(14, 12, 3);
  set(15, 12, 3);
  set(29, 9, 3);
  set(48, 11, 3);
  set(63, 8, 3);
  set(64, 8, 3);
  // Two spikes (2) on the floor to jump over.
  set(36, rows - 2, 2);
  set(54, rows - 2, 2);
  // Goal flag (4) near the end.
  set(82, rows - 2, 4);
  return {
    version: 1,
    cols,
    rows,
    tiles,
    spawn: { col: 2, row: rows - 2 },
    theme: "jungle",
  };
}

// Builds a top-down arena: bordered room with gems, enemies and an exit.
function sampleArena() {
  const cols = 30;
  const rows = 18;
  const tiles = new Array(cols * rows).fill(0);
  const set = (c: number, r: number, v: number) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) tiles[r * cols + c] = v;
  };
  // Wall border (A_WALL = 1).
  for (let c = 0; c < cols; c++) {
    set(c, 0, 1);
    set(c, rows - 1, 1);
  }
  for (let r = 0; r < rows; r++) {
    set(0, r, 1);
    set(cols - 1, r, 1);
  }
  // Inner walls to navigate around.
  for (let r = 3; r < 10; r++) set(11, r, 1);
  for (let r = 8; r < 15; r++) set(20, r, 1);
  // Gems (A_GEM = 2).
  const gems = [
    [5, 5],
    [7, 13],
    [9, 8],
    [15, 4],
    [16, 14],
    [24, 5],
    [25, 12],
    [27, 8],
  ];
  for (const [c, r] of gems) set(c, r, 2);
  // Enemies (A_ENEMY = 3).
  set(14, 9, 3);
  set(23, 4, 3);
  // Exit (A_EXIT = 4).
  set(27, 15, 4);
  return {
    kind: "arena",
    cols,
    rows,
    tiles,
    spawn: { col: 2, row: 2 },
    theme: "space",
  };
}

export async function seedWorlds() {
  // Ensure the official Arcanova account exists (it is never logged into).
  const hash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  await pool.query(
    `INSERT INTO users (username, email, password_hash, display_name)
     VALUES ('arcanova', 'system@arcanova.local', $1, 'Arcanova')
     ON CONFLICT (username) DO NOTHING`,
    [hash],
  );
  const account = await pool.query(
    `SELECT id FROM users WHERE username = 'arcanova'`,
  );
  const creatorId = account.rows[0].id;

  // Seed only once.
  const existing = await pool.query(
    `SELECT count(*)::int AS n FROM games WHERE creator_id = $1`,
    [creatorId],
  );
  if (existing.rows[0].n > 0) return;

  const samples = [
    {
      title: "Welcome Run",
      description: "A short starter platformer — run, jump the spikes, reach the flag.",
      definition: samplePlatformer(),
    },
    {
      title: "Gem Hunt",
      description: "A top-down arena — grab every gem, dodge the enemies, find the exit.",
      definition: sampleArena(),
    },
  ];
  for (const s of samples) {
    await pool.query(
      `INSERT INTO games (creator_id, title, description, definition, published)
       VALUES ($1, $2, $3, $4, true)`,
      [creatorId, s.title, s.description, s.definition],
    );
  }
  console.log(`Seeded ${samples.length} example worlds.`);
}
