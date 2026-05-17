// Shared 2D platformer level format.
// A level's `definition` (stored as JSONB on the game row) is a Level object.

export const COLS = 40;
export const ROWS = 18;
export const TILE = 32;

export const EMPTY = 0;
export const SOLID = 1;
export const SPIKE = 2;
export const COIN = 3;
export const GOAL = 4;
export const BOUNCER = 5;
export const ONEWAY = 6;
export const MOVER_H = 7; // moving platform — travels horizontally
export const MOVER_V = 8; // moving platform — travels vertically

export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Level {
  version: number;
  cols: number;
  rows: number;
  tiles: number[]; // flat array, length cols * rows, row-major
  spawn: { col: number; row: number };
}

export interface PaletteEntry {
  type: TileType;
  label: string;
  color: string;
}

// Tools shown in the editor palette. "Spawn" and "Eraser" are handled specially.
export const PALETTE: PaletteEntry[] = [
  { type: SOLID, label: "Ground", color: "#5b8c5a" },
  { type: ONEWAY, label: "Platform", color: "#7c93c7" },
  { type: BOUNCER, label: "Bouncer", color: "#e8a13c" },
  { type: MOVER_H, label: "Mover ↔", color: "#c98a3a" },
  { type: MOVER_V, label: "Mover ↕", color: "#c98a3a" },
  { type: SPIKE, label: "Spikes", color: "#d6536d" },
  { type: COIN, label: "Coin", color: "#ffce5c" },
  { type: GOAL, label: "Goal", color: "#4fd6ff" },
];

export function createEmptyLevel(): Level {
  const tiles = new Array(COLS * ROWS).fill(EMPTY);
  // A starting strip of ground along the bottom row.
  for (let c = 0; c < COLS; c++) tiles[(ROWS - 1) * COLS + c] = SOLID;
  return {
    version: 1,
    cols: COLS,
    rows: ROWS,
    tiles,
    spawn: { col: 2, row: ROWS - 2 },
  };
}

// Returns a valid Level whether the stored definition is empty, partial or full.
export function normalizeLevel(def: unknown): Level {
  const d = def as Partial<Level> | null | undefined;
  if (!d || !Array.isArray(d.tiles) || d.tiles.length !== COLS * ROWS) {
    return createEmptyLevel();
  }
  return {
    version: 1,
    cols: COLS,
    rows: ROWS,
    tiles: d.tiles.map((t) => Number(t) || 0),
    spawn: d.spawn ?? { col: 2, row: ROWS - 2 },
  };
}
