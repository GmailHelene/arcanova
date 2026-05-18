// Top-down arena world type. A separate format from the platformer level.
// A game's definition is tagged with `kind` so the editor and runtime know
// which world type to use ("arena" here; platformer levels carry no kind).

import { TILE, DEFAULT_THEME } from "./level";

export { TILE };

// Arenas are a fixed size that fills the runtime viewport — no scrolling.
export const ARENA_COLS = 30;
export const ARENA_ROWS = 18;

export const A_EMPTY = 0;
export const A_WALL = 1;
export const A_GEM = 2;
export const A_ENEMY = 3;
export const A_EXIT = 4;

export interface Arena {
  kind: "arena";
  cols: number;
  rows: number;
  tiles: number[];
  spawn: { col: number; row: number };
  theme: string;
}

export interface ArenaPaletteEntry {
  type: number;
  label: string;
  color: string;
}

export const ARENA_PALETTE: ArenaPaletteEntry[] = [
  { type: A_WALL, label: "Wall", color: "#5b6c8c" },
  { type: A_GEM, label: "Gem", color: "#ffce5c" },
  { type: A_ENEMY, label: "Enemy", color: "#d6536d" },
  { type: A_EXIT, label: "Exit", color: "#4fd6ff" },
];

export function createEmptyArena(): Arena {
  const tiles = new Array(ARENA_COLS * ARENA_ROWS).fill(A_EMPTY);
  // A wall border so the player cannot leave the arena.
  for (let c = 0; c < ARENA_COLS; c++) {
    tiles[c] = A_WALL;
    tiles[(ARENA_ROWS - 1) * ARENA_COLS + c] = A_WALL;
  }
  for (let r = 0; r < ARENA_ROWS; r++) {
    tiles[r * ARENA_COLS] = A_WALL;
    tiles[r * ARENA_COLS + ARENA_COLS - 1] = A_WALL;
  }
  return {
    kind: "arena",
    cols: ARENA_COLS,
    rows: ARENA_ROWS,
    tiles,
    spawn: { col: 2, row: 2 },
    theme: DEFAULT_THEME,
  };
}

export function normalizeArena(def: unknown): Arena {
  const d = def as Partial<Arena> | null | undefined;
  if (
    d &&
    Array.isArray(d.tiles) &&
    typeof d.cols === "number" &&
    typeof d.rows === "number" &&
    d.cols > 0 &&
    d.rows > 0 &&
    d.tiles.length === d.cols * d.rows
  ) {
    return {
      kind: "arena",
      cols: d.cols,
      rows: d.rows,
      tiles: d.tiles.map((t) => Number(t) || 0),
      spawn: d.spawn ?? { col: 2, row: 2 },
      theme: typeof d.theme === "string" ? d.theme : DEFAULT_THEME,
    };
  }
  return createEmptyArena();
}

// A game's world type. Platformer levels carry no `kind`, so anything that
// is not explicitly an arena is treated as a platformer.
export function worldKind(def: unknown): "arena" | "platformer" {
  return def && (def as { kind?: string }).kind === "arena"
    ? "arena"
    : "platformer";
}
