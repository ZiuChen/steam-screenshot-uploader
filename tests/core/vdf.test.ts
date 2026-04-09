import { describe, expect, test } from "vite-plus/test";
import {
  findGameSection,
  insertGameSection,
  appendScreenshotEntry,
  getLastEntryNumber,
  hasScreenshotEntry,
} from "../../src/core/vdf.ts";

describe("VDF parser", () => {
  const sampleVdf = [
    '"screenshots"',
    "{",
    '\t"760"',
    "\t{",
    '\t\t"1"',
    "\t\t{",
    '\t\t\t"type"\t\t"1"',
    '\t\t\t"filename"\t\t"760/screenshots/20240101120000_1.jpg"',
    '\t\t\t"thumbnail"\t\t"760/screenshots/thumbnails/20240101120000_1.jpg"',
    '\t\t\t"width"\t\t"1920"',
    '\t\t\t"height"\t\t"1080"',
    '\t\t\t"gameid"\t\t"760"',
    '\t\t\t"creation"\t\t"1704110400"',
    "\t\t}",
    "\t}",
    '\t"shortcutnames"',
    "\t{",
    "\t}",
    "}",
  ];

  test("findGameSection finds existing section", () => {
    const section = findGameSection(sampleVdf, "760");
    expect(section).not.toBeNull();
    expect(section!.start).toBe(2);
    expect(section!.end).toBe(14);
  });

  test("findGameSection returns null for missing section", () => {
    const section = findGameSection(sampleVdf, "999");
    expect(section).toBeNull();
  });

  test("getLastEntryNumber", () => {
    const num = getLastEntryNumber(sampleVdf, "760");
    expect(num).toBe(1);
  });

  test("hasScreenshotEntry", () => {
    expect(hasScreenshotEntry(sampleVdf, "760", "20240101120000_1.jpg")).toBe(true);
    expect(hasScreenshotEntry(sampleVdf, "760", "nonexistent.jpg")).toBe(false);
  });

  test("insertGameSection", () => {
    const lines = [...sampleVdf];
    insertGameSection(lines, "730");
    const section = findGameSection(lines, "730");
    expect(section).not.toBeNull();
  });

  test("appendScreenshotEntry", () => {
    const lines = [...sampleVdf];
    appendScreenshotEntry(lines, "760", {
      entryNumber: 2,
      filename: "20240102120000_1.jpg",
      thumbnailFilename: "20240102120000_1.jpg",
      width: 1920,
      height: 1080,
      gameId: "760",
      creationTime: 1704196800,
    });
    expect(hasScreenshotEntry(lines, "760", "20240102120000_1.jpg")).toBe(true);
  });
});
