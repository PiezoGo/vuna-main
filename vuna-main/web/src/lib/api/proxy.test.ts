import { describe, expect, it } from "vitest";

import { buildUpstreamUrl, filterRequestHeaders, filterResponseHeaders } from "./proxy";

describe("buildUpstreamUrl", () => {
  const api = "http://127.0.0.1:8000/api";

  it("maps /api/backend/api/products to Django with a trailing slash", () => {
    expect(buildUpstreamUrl(api, ["api", "products"], "?page=2")?.toString()).toBe(
      "http://127.0.0.1:8000/api/products/?page=2",
    );
  });

  it("handles nested ids", () => {
    expect(buildUpstreamUrl(`${api}/`, ["api", "orders", "12", "mock_pay"], "")?.toString()).toBe(
      "http://127.0.0.1:8000/api/orders/12/mock_pay/",
    );
  });

  it("rejects non-API paths and traversal", () => {
    expect(buildUpstreamUrl(api, ["admin", "login"], "")).toBeNull();
    expect(buildUpstreamUrl(api, ["api", "..", "admin"], "")).toBeNull();
  });
});

describe("header filtering", () => {
  it("never forwards the browser's cookies or its own Authorization", () => {
    const out = filterRequestHeaders(
      new Headers({
        cookie: "vuna_session=abc",
        authorization: "Token evil",
        accept: "application/json",
      }),
    );
    expect(out.get("cookie")).toBeNull();
    expect(out.get("authorization")).toBeNull();
    expect(out.get("accept")).toBe("application/json");
  });

  it("never lets Django set cookies on our domain", () => {
    const out = filterResponseHeaders(
      new Headers({ "set-cookie": "csrftoken=x", "content-type": "application/json" }),
    );
    expect(out.get("set-cookie")).toBeNull();
    expect(out.get("content-type")).toBe("application/json");
  });
});
