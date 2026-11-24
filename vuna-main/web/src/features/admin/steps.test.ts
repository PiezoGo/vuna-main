import { describe, expect, it } from "vitest";

import { groupByArea, nextStep } from "@/features/admin/steps";

describe("nextStep", () => {
  it("follows collected → delivered → completed", () => {
    expect(nextStep("assigned")?.step).toBe("collected");
    expect(nextStep("collected")?.step).toBe("delivered");
    expect(nextStep("delivered")?.step).toBe("completed");
    expect(nextStep("completed")).toBeNull();
    expect(nextStep("pending")).toBeNull();
  });
});

describe("groupByArea", () => {
  it("groups and sorts by area", () => {
    const groups = groupByArea([
      { id: 1, delivery_area: "Westlands" },
      { id: 2, delivery_area: "Karen" },
      { id: 3, delivery_area: "Westlands" },
      { id: 4, delivery_area: null },
    ]);
    expect(groups.map(([area, lines]) => [area, lines.map((l) => l.id)])).toEqual([
      ["Karen", [2]],
      ["No area", [4]],
      ["Westlands", [1, 3]],
    ]);
  });
});
