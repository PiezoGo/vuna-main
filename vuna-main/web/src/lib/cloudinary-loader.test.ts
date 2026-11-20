import { describe, expect, it } from "vitest";

import cloudinaryLoader from "./cloudinary-loader";

describe("cloudinaryLoader", () => {
  it("adds resize and format transforms to Cloudinary URLs", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v1/product_images/tomatoes.jpg";
    expect(cloudinaryLoader({ src, width: 640 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1/product_images/tomatoes.jpg",
    );
  });

  it("respects an explicit quality", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/a.jpg";
    expect(cloudinaryLoader({ src, width: 320, quality: 60 })).toContain("q_60,");
  });

  it("leaves other URLs untouched", () => {
    expect(cloudinaryLoader({ src: "/logo.svg", width: 64 })).toBe("/logo.svg");
    const local = "http://localhost:8000/media/product_images/a.jpg";
    expect(cloudinaryLoader({ src: local, width: 64 })).toBe(local);
  });
});
