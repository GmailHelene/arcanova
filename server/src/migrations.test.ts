import { describe, it, expect } from "vitest";
import { MIGRATIONS } from "./migrations";

describe("MIGRATIONS", () => {
  it("has unique migration names", () => {
    const names = MIGRATIONS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps names in sorted (apply) order", () => {
    const names = MIGRATIONS.map((m) => m.name);
    expect([...names].sort()).toEqual(names);
  });

  it("every migration has non-empty SQL", () => {
    for (const m of MIGRATIONS) {
      expect(m.sql.trim().length).toBeGreaterThan(0);
    }
  });
});
