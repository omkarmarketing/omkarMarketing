import { describe, expect, it } from "vitest";
import {
  createInvoiceFingerprint,
  roundCurrency,
} from "@/lib/invoice-utils";

describe("invoice utilities", () => {
  it("rounds currency values to cents without binary floating-point artifacts", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
    expect(roundCurrency(1.005)).toBe(1.01);
  });

  it("creates stable fingerprints for matching preview inputs", () => {
    expect(createInvoiceFingerprint({ amount: 12.5, rows: [1, 2] })).toBe(
      createInvoiceFingerprint({ amount: 12.5, rows: [1, 2] }),
    );
    expect(createInvoiceFingerprint({ amount: 12.5 })).not.toBe(
      createInvoiceFingerprint({ amount: 12.51 }),
    );
  });
});
