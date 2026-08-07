import { describe, expect, it } from "bun:test";

import { zipEntryNames } from "../download";

describe("zipEntryNames", () => {
  it("returns names unchanged when there are no collisions", () => {
    const names = ["a-pigo.jpg", "b-pigo.png", "c-pigo.webp"];
    expect(zipEntryNames(names)).toEqual(names);
  });

  it("suffixes the second occurrence of a duplicate name", () => {
    expect(zipEntryNames(["x-pigo.jpg", "x-pigo.jpg"])).toEqual([
      "x-pigo.jpg",
      "x-pigo (2).jpg",
    ]);
  });

  it("increments the suffix for three or more duplicates", () => {
    expect(zipEntryNames(["x-pigo.jpg", "x-pigo.jpg", "x-pigo.jpg"])).toEqual([
      "x-pigo.jpg",
      "x-pigo (2).jpg",
      "x-pigo (3).jpg",
    ]);
  });

  it("resolves uniquely when a pre-existing suffixed name collides with a generated one", () => {
    const result = zipEntryNames([
      "x-pigo.jpg",
      "x-pigo (2).jpg",
      "x-pigo.jpg",
    ]);
    expect(result).toEqual(["x-pigo.jpg", "x-pigo (2).jpg", "x-pigo (3).jpg"]);
  });

  it("preserves the extension and places the suffix before it", () => {
    expect(zipEntryNames(["photo-pigo.jpeg", "photo-pigo.jpeg"])).toEqual([
      "photo-pigo.jpeg",
      "photo-pigo (2).jpeg",
    ]);
  });

  it("returns an empty list for an empty input", () => {
    expect(zipEntryNames([])).toEqual([]);
  });

  it("produces no duplicates for a mixed set of names", () => {
    const names = [
      "a-pigo.jpg",
      "a-pigo.jpg",
      "a-pigo.jpg",
      "b-pigo.png",
      "a-pigo (2).jpg",
      "c-pigo.webp",
      "b-pigo.png",
      "a-pigo.jpg",
      "d-pigo.jpg",
      "a-pigo (3).jpg",
    ];
    const result = zipEntryNames(names);
    expect(result).toHaveLength(names.length);
    expect(new Set(result).size).toBe(result.length);
  });
});
