import { beforeEach, describe, expect, it } from "vitest";

import { useCart } from "./store";

describe("cart store", () => {
  beforeEach(() => useCart.setState({ items: [] }));

  it("adds, merges, updates and removes items", () => {
    const { add, setQuantity, remove } = useCart.getState();
    add(1, 5);
    add(1, 3);
    add(2, 10);
    expect(useCart.getState().items).toEqual([
      { product: 1, quantity: 8 },
      { product: 2, quantity: 10 },
    ]);
    setQuantity(2, 0);
    expect(useCart.getState().items[1]).toEqual({ product: 2, quantity: 1 });
    remove(1);
    expect(useCart.getState().items).toEqual([{ product: 2, quantity: 1 }]);
  });
});
