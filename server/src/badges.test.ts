import { describe, it, expect } from "vitest";
import { badgesFor } from "./badges";

const earnedIds = (stats: Parameters<typeof badgesFor>[0]) =>
  badgesFor(stats)
    .filter((b) => b.earned)
    .map((b) => b.id);

describe("badgesFor", () => {
  it("earns nothing for a brand-new creator", () => {
    expect(earnedIds({ publishedWorlds: 0, totalPlays: 0, totalLikes: 0 })).toEqual(
      [],
    );
  });

  it("earns First World after one published world", () => {
    expect(
      earnedIds({ publishedWorlds: 1, totalPlays: 0, totalLikes: 0 }),
    ).toContain("first_world");
  });

  it("earns Prolific, Crowd-Pleaser and Beloved at the thresholds", () => {
    const ids = earnedIds({
      publishedWorlds: 5,
      totalPlays: 50,
      totalLikes: 25,
    });
    expect(ids).toEqual(
      expect.arrayContaining([
        "first_world",
        "prolific",
        "crowd_pleaser",
        "beloved",
      ]),
    );
  });

  it("does not earn a badge just below its threshold", () => {
    const ids = earnedIds({ publishedWorlds: 4, totalPlays: 49, totalLikes: 24 });
    expect(ids).not.toContain("prolific");
    expect(ids).not.toContain("crowd_pleaser");
    expect(ids).not.toContain("beloved");
  });
});
