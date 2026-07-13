// Increment 8 — participant-side sharing tests.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionSharingPanel } from "./DecisionSharingPanel";
import type { DecisionShare, OrgLink } from "@/lib/institutions";

const link = (over: Partial<OrgLink> = {}): OrgLink => ({
  id: "l1", organisation_id: "org1", organisation_name: "Northside College", revoked_at: null, ...over,
});
const share = (over: Partial<DecisionShare> = {}): DecisionShare => ({
  id: "s1", saved_decision_id: "sd1", organisation_id: "org1", revoked_at: null, ...over,
});

const noop = () => {};
const baseProps = {
  busy: false, onJoin: noop, onShare: noop, onRevokeShare: noop, onRevokeLink: noop,
};

describe("DecisionSharingPanel", () => {
  it("defaults to not sharing, and says so plainly", () => {
    render(<DecisionSharingPanel {...baseProps} links={[link()]} shares={[]} />);
    expect(screen.getByText(/Nothing is shared unless you choose to share it/)).toBeTruthy();
    expect(screen.getByText("Not sharing this decision")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^share this decision$/i })).toBeTruthy();
  });

  it("shows an active share with one-click revocation", async () => {
    const user = userEvent.setup();
    const onRevokeShare = vi.fn();
    render(<DecisionSharingPanel {...baseProps} onRevokeShare={onRevokeShare} links={[link()]} shares={[share()]} />);
    expect(screen.getByText("Sharing this decision")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /stop sharing/i }));
    expect(onRevokeShare).toHaveBeenCalledWith("s1");
  });

  it("joins an organisation by code and surfaces unknown-code errors", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    const { rerender } = render(<DecisionSharingPanel {...baseProps} onJoin={onJoin} links={[]} shares={[]} />);
    expect(screen.getByText(/Not connected to an organisation/)).toBeTruthy();
    const input = screen.getByLabelText("Organisation code");
    await user.type(input, "  NORTH-2026  ");
    await user.click(screen.getByRole("button", { name: /connect/i }));
    expect(onJoin).toHaveBeenCalledWith("NORTH-2026");
    rerender(<DecisionSharingPanel {...baseProps} onJoin={onJoin} links={[]} shares={[]} joinError="We didn't recognise that code — check it with your adviser." />);
    expect(screen.getByRole("alert").textContent).toContain("didn't recognise that code");
  });

  it("lets the participant disconnect from an organisation entirely", async () => {
    const user = userEvent.setup();
    const onRevokeLink = vi.fn();
    render(<DecisionSharingPanel {...baseProps} onRevokeLink={onRevokeLink} links={[link()]} shares={[share()]} />);
    await user.click(screen.getByRole("button", { name: /disconnect from northside college/i }));
    expect(onRevokeLink).toHaveBeenCalledWith("l1");
  });

  it("scopes the share to this decision in its own words", () => {
    render(<DecisionSharingPanel {...baseProps} links={[link()]} shares={[]} />);
    expect(screen.getByText(/their advisers can see this saved result — nothing else/)).toBeTruthy();
    expect(screen.getByText(/stop sharing at any time/)).toBeTruthy();
  });
});
