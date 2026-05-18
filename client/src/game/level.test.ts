import { describe, it, expect } from "vitest";
import {
  COLS,
  ROWS,
  SOLID,
  createEmptyLevel,
  normalizeLevel,
  getTheme,
  THEMES,
  DEFAULT_THEME,
} from "./level";

describe("createEmptyLevel", () => {
  it("creates a full grid of the default size", () => {
    expect(createEmptyLevel().tiles).toHaveLength(COLS * ROWS);
  });

  it("lays a floor along the bottom row", () => {
    const level = createEmptyLevel();
    for (let c = 0; c < COLS; c++) {
      expect(level.tiles[(ROWS - 1) * COLS + c]).toBe(SOLID);
    }
  });

  it("uses the default theme", () => {
    expect(createEmptyLevel().theme).toBe(DEFAULT_THEME);
  });
});

describe("normalizeLevel", () => {
  it("returns an empty level for missing or invalid input", () => {
    expect(normalizeLevel(undefined).tiles).toHaveLength(COLS * ROWS);
    expect(normalizeLevel(null).tiles).toHaveLength(COLS * ROWS);
    expect(normalizeLevel({}).tiles).toHaveLength(COLS * ROWS);
  });

  it("preserves a level saved at an older, smaller size", () => {
    const old = {
      version: 1,
      cols: 40,
      rows: 18,
      tiles: new Array(40 * 18).fill(0),
      spawn: { col: 2, row: 16 },
      theme: "jungle",
    };
    const result = normalizeLevel(old);
    expect(result.cols).toBe(40);
    expect(result.rows).toBe(18);
    expect(result.tiles).toHaveLength(40 * 18);
    expect(result.theme).toBe("jungle");
  });

  it("rejects a level whose tile count does not match its size", () => {
    const broken = { cols: 40, rows: 18, tiles: [1, 2, 3] };
    expect(normalizeLevel(broken).tiles).toHaveLength(COLS * ROWS);
  });

  it("defaults the theme when it is missing", () => {
    const level = {
      cols: COLS,
      rows: ROWS,
      tiles: new Array(COLS * ROWS).fill(0),
    };
    expect(normalizeLevel(level).theme).toBe(DEFAULT_THEME);
  });
});

describe("getTheme", () => {
  it("returns a known theme by id", () => {
    expect(getTheme("space").id).toBe("space");
  });

  it("falls back to the first theme for unknown or missing ids", () => {
    expect(getTheme(undefined)).toBe(THEMES[0]);
    expect(getTheme("nonexistent")).toBe(THEMES[0]);
  });
});
