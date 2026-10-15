import { describe, expect, it } from "vitest";
import { parseDateFromSheet } from "@/lib/date-utils";

describe("parseDateFromSheet", () => {
  it("parses ISO date-only values without changing their calendar day", () => {
    const date = parseDateFromSheet("2024-02-29");

    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(29);
  });

  it("rejects invalid ISO calendar dates instead of rolling them forward", () => {
    expect(Number.isNaN(parseDateFromSheet("2023-02-29").getTime())).toBe(true);
    expect(Number.isNaN(parseDateFromSheet("2024-13-01").getTime())).toBe(true);
  });

  it("continues to parse the existing day-first Sheets date format", () => {
    const date = parseDateFromSheet("15-01-24");

    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
  });
});
