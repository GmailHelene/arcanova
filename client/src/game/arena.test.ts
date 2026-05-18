import { describe, it, expect } from "vitest";
import {
  createEmptyArena,
  normalizeArena,
  worldKind,
  ARENA_COLS,
  ARENA_ROWS,
  A_WALL,
} from "./arena";

describe("createEmptyArena", () => {
  it("creates a full grid tagged as an arena", () => {
    const a = createEmptyArena();
    expect(a.tiles).toHaveLength(ARENA_COLS * ARENA_ROWS);
    expect(a.kind).toBe("arena");
  });

  it("surrounds the arena with a wall border", () => {
    const a = createEmptyArena();
    expect(a.tiles[0]).toBe(A_WALL);
    expect(a.tiles[ARENA_COLS - 1]).toBe(A_WALL);
  });
});

describe("worldKind", () => {
  it("detects an arena by its kind tag", () => {
    expect(worldKind({ kind: "arena" })).toBe("arena");
  });

  it("treats anything without that tag as a platformer", () => {
    expect(worldKind({})).toBe("platformer");
    expect(worldKind(null)).toBe("platformer");
    expect(worldKind({ kind: "platformer" })).toBe("platformer");
  });
});

describe("normalizeArena", () => {
  it("falls back to an empty arena for invalid input", () => {
    expect(normalizeArena(null).tiles).toHaveLength(ARENA_COLS * ARENA_ROWS);
    expect(normalizeArena({}).tiles).toHaveLength(ARENA_COLS * ARENA_ROWS);
  });
});
