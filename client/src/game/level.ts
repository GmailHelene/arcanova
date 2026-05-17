// Shared 2D platformer level format.
// A level's `definition` (stored as JSONB on the game row) is a Level object.

export const COLS = 90; // levels are wider than the screen; the camera scrolls
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
  theme: string;
}

// A theme gives a level a visual identity. Gameplay tiles (spikes, coins,
// goal, bouncer) keep fixed colors so they stay readable in every theme.
export interface Theme {
  id: string;
  name: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundTop: string;
}

export const THEMES: Theme[] = [
  { id: "twilight", name: "Twilight", skyTop: "#2a2356", skyBottom: "#181433", ground: "#5b8c5a", groundTop: "#6fa86d" },
  { id: "jungle", name: "Jungle", skyTop: "#1f4d2e", skyBottom: "#0e2a1a", ground: "#6b4a2a", groundTop: "#3f8a3f" },
  { id: "space", name: "Space", skyTop: "#0a0a2e", skyBottom: "#02020f", ground: "#454569", groundTop: "#8585bd" },
  { id: "cave", name: "Cave", skyTop: "#231f2e", skyBottom: "#0c0a14", ground: "#4a3f55", groundTop: "#6a5a78" },
  { id: "snow", name: "Snow", skyTop: "#5a7fae", skyBottom: "#324a6e", ground: "#8f9db6", groundTop: "#eef3ff" },
  { id: "lava", name: "Lava", skyTop: "#4a1820", skyBottom: "#1c0a0c", ground: "#3a2520", groundTop: "#c7531f" },
];

export const DEFAULT_THEME = "twilight";

export function getTheme(id?: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
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
    theme: DEFAULT_THEME,
  };
}

// Returns a valid Level whether the stored definition is empty, partial or full.
// A level keeps its own stored cols/rows, so levels saved at an earlier size
// (e.g. the original 40-wide grid) keep working as the default size grows.
export function normalizeLevel(def: unknown): Level {
  const d = def as Partial<Level> | null | undefined;
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
      version: 1,
      cols: d.cols,
      rows: d.rows,
      tiles: d.tiles.map((t) => Number(t) || 0),
      spawn: d.spawn ?? { col: 2, row: d.rows - 2 },
      theme: typeof d.theme === "string" ? d.theme : DEFAULT_THEME,
    };
  }
  return createEmptyLevel();
}
