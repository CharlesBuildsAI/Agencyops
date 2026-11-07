import { describe, expect, it } from "vitest";
import { buildSimplePdf } from "./certificate";

describe("certificate file", () => {
  it("builds a PDF document", () => {
    const bytes = buildSimplePdf(["Certificate of Insurance", "Named insured: Ridge Roofing LLC"]);
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe("%PDF-1.4");
  });
});
