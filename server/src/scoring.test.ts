import { describe, it, expect } from "vitest";
import { maxPossibleScore, MAX_TIME_BONUS } from "./scoring";

describe("maxPossibleScore", () => {
  it("is just the time bonus when a level has no coins", () => {
    expect(maxPossibleScore({ tiles: [0, 1, 1, 0] })).toBe(MAX_TIME_BONUS);
  });

  it("adds 1000 per coin tile", () => {
    expect(maxPossibleScore({ tiles: [3, 3, 0, 1] })).toBe(2000 + MAX_TIME_BONUS);
  });

  it("treats missing or invalid definitions as having no coins", () => {
    expect(maxPossibleScore(null)).toBe(MAX_TIME_BONUS);
    expect(maxPossibleScore(undefined)).toBe(MAX_TIME_BONUS);
    expect(maxPossibleScore({})).toBe(MAX_TIME_BONUS);
    expect(maxPossibleScore({ tiles: "not-an-array" })).toBe(MAX_TIME_BONUS);
  });
});
