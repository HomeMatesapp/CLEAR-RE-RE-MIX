import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UnreviewedRealityCheckFallback } from "./UnreviewedRealityCheckFallback";

const renderFallback = (slug = "social-worker", name = "Social Worker") =>
  render(
    <MemoryRouter>
      <UnreviewedRealityCheckFallback roleSlug={slug} roleName={name} />
    </MemoryRouter>,
  );

describe("UnreviewedRealityCheckFallback", () => {
  it("shows the honest 'not ready' heading with the role name", () => {
    renderFallback();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Reality-check is not ready for Social Worker yet/i,
      }),
    ).toBeInTheDocument();
  });

  it("explains why we don't guess", () => {
    renderFallback();
    expect(
      screen.getByText(/we will not guess/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/entry routes, requirements and judgement logic have been reviewed/i),
    ).toBeInTheDocument();
  });

  it("offers a link back to the role page", () => {
    renderFallback();
    const link = screen.getByRole("link", { name: /View the Social Worker role page/i });
    expect(link).toHaveAttribute("href", "/role/social-worker");
  });

  it("suggests reviewed pilot roles that actually have a Reality-check", () => {
    renderFallback();
    const section = screen
      .getByRole("heading", { name: /What you can do instead/i })
      .closest("section")!;
    // Pilots should include at least these three reviewed roles.
    expect(within(section).getByRole("link", { name: /Registered Nurse/i })).toHaveAttribute(
      "href",
      "/role/registered-nurse/reality-check",
    );
    expect(within(section).getByRole("link", { name: /Software Engineer/i })).toHaveAttribute(
      "href",
      "/role/software-engineer/reality-check",
    );
    expect(within(section).getByRole("link", { name: /Electrician/i })).toHaveAttribute(
      "href",
      "/role/electrician/reality-check",
    );
  });

  it("does not suggest the current role as a pilot", () => {
    renderFallback("electrician", "Electrician");
    const section = screen
      .getByRole("heading", { name: /What you can do instead/i })
      .closest("section")!;
    // The current-role link inside pilots would point at /role/electrician/reality-check.
    const pilotLinks = within(section)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.endsWith("/reality-check"));
    for (const link of pilotLinks) {
      expect(link.getAttribute("href")).not.toBe("/role/electrician/reality-check");
    }
  });

  it("offers a 'Request this Reality-check' action pointing at support with role context", () => {
    renderFallback();
    const link = screen.getByRole("link", { name: /Request this Reality-check/i });
    expect(link.getAttribute("href")).toContain("/support");
    expect(link.getAttribute("href")).toContain("role=social-worker");
    expect(link.getAttribute("href")).toContain("topic=reality-check-request");
  });

  it("includes reassurance copy that the role is not being judged as bad", () => {
    renderFallback();
    expect(
      screen.getByText(/does not mean Social Worker is a bad route/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/has not reviewed this route deeply enough to judge it yet/i),
    ).toBeInTheDocument();
  });
});
