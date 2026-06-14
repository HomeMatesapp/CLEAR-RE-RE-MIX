import { describe, it, expect } from "vitest";
import { slugifyRole, deslugifyRole, normalizeRoleName } from "./role";

describe("slugifyRole", () => {
  it("converts a multi-word role into a slug", () => {
    expect(slugifyRole("Customer Acquisition Specialist")).toBe(
      "customer-acquisition-specialist"
    );
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugifyRole("UX/UI Designer")).toBe("uxui-designer");
  });

  it("collapses multiple consecutive hyphens", () => {
    expect(slugifyRole("Data   Analyst")).toBe("data-analyst");
    expect(slugifyRole("Foo -- Bar")).toBe("foo-bar");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugifyRole("  -Data Analyst-  ")).toBe("data-analyst");
  });

  it("handles extra leading/trailing/internal whitespace", () => {
    expect(slugifyRole("   Data    Analyst   ")).toBe("data-analyst");
    expect(slugifyRole("\tProduct\nManager\t")).toBe("product-manager");
  });

  it("strips punctuation", () => {
    expect(slugifyRole("Front-End Developer (Senior)!")).toBe("front-end-developer-senior");
    expect(slugifyRole("C++ Engineer")).toBe("c-engineer");
    expect(slugifyRole("Sales & Marketing")).toBe("sales-marketing");
  });

  it("normalises mixed casing", () => {
    expect(slugifyRole("DATA analyst")).toBe("data-analyst");
    expect(slugifyRole("uX/Ui DESIGNER")).toBe("uxui-designer");
  });

  it("returns empty string for empty/null/undefined input", () => {
    expect(slugifyRole("")).toBe("");
    expect(slugifyRole(null)).toBe("");
    expect(slugifyRole(undefined)).toBe("");
  });
});

describe("deslugifyRole", () => {
  it("converts a slug back to a title", () => {
    expect(deslugifyRole("customer-acquisition-specialist")).toBe(
      "Customer Acquisition Specialist"
    );
  });

  it("returns empty string for empty/null/undefined input", () => {
    expect(deslugifyRole("")).toBe("");
    expect(deslugifyRole(null)).toBe("");
    expect(deslugifyRole(undefined)).toBe("");
  });
});

describe("normalizeRoleName", () => {
  it("trims and collapses internal whitespace, title-cases each word", () => {
    expect(normalizeRoleName("  customer   acquisition specialist  ")).toBe(
      "Customer Acquisition Specialist"
    );
  });

  it("returns empty string for empty/null/undefined input", () => {
    expect(normalizeRoleName("")).toBe("");
    expect(normalizeRoleName(null)).toBe("");
    expect(normalizeRoleName(undefined)).toBe("");
  });
});
