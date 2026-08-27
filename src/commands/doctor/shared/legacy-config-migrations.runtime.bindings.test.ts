import { describe, expect, it } from "vitest";
import { findLegacyConfigIssues } from "../../../config/legacy.js";
import { applyLegacyDoctorMigrations } from "./legacy-config-compat.js";

type BindingEntry = {
  match?: { channel?: string; peer?: { kind?: string; id?: string } };
};

function getBindingKinds(next: Record<string, unknown> | null): string[] {
  const bindings = next?.bindings;
  if (!Array.isArray(bindings)) {
    return [];
  }
  return (bindings as BindingEntry[]).map((b) => b?.match?.peer?.kind ?? "");
}

describe("bindings peer.kind dm→direct migration", () => {
  it("detects legacy dm peer.kind in bindings", () => {
    const raw = {
      bindings: [
        {
          agentId: "main",
          match: { channel: "telegram", peer: { kind: "dm", id: "123" } },
        },
      ],
    };
    const issues = findLegacyConfigIssues(raw);
    expect(issues.some((issue) => issue.message.includes("dm"))).toBe(true);
  });

  it("rewrites dm to direct in a single binding", () => {
    const raw = {
      bindings: [
        {
          agentId: "main",
          match: { channel: "telegram", peer: { kind: "dm", id: "123" } },
        },
      ],
    };
    const result = applyLegacyDoctorMigrations(raw);

    expect(getBindingKinds(result.next)).toEqual(["direct"]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toContain("dm");
    expect(result.changes[0]).toContain("direct");
  });

  it("rewrites dm to direct in multiple bindings", () => {
    const raw = {
      bindings: [
        {
          agentId: "main",
          match: { channel: "telegram", peer: { kind: "dm", id: "1" } },
        },
        {
          agentId: "worker",
          match: { channel: "discord", peer: { kind: "group", id: "2" } },
        },
        {
          agentId: "main",
          match: { channel: "telegram", peer: { kind: "dm", id: "3" } },
        },
      ],
    };
    const result = applyLegacyDoctorMigrations(raw);

    expect(getBindingKinds(result.next)).toEqual(["direct", "group", "direct"]);
    expect(result.changes[0]).toContain("2");
  });

  it("preserves already-direct peer.kind", () => {
    const raw = {
      bindings: [
        {
          agentId: "main",
          match: { channel: "telegram", peer: { kind: "direct", id: "123" } },
        },
      ],
    };
    const result = applyLegacyDoctorMigrations(raw);

    expect(result.next).toBeNull();
    expect(result.changes).toHaveLength(0);
  });

  it("is idempotent", () => {
    const raw = {
      bindings: [
        {
          agentId: "main",
          match: { channel: "telegram", peer: { kind: "dm", id: "123" } },
        },
      ],
    };
    const first = applyLegacyDoctorMigrations(raw);
    const second = applyLegacyDoctorMigrations(first.next ?? {});

    expect(second.next).toBeNull();
    expect(second.changes).toHaveLength(0);
  });

  it("handles bindings without peer", () => {
    const raw = {
      bindings: [
        {
          agentId: "main",
          match: { channel: "telegram" },
        },
      ],
    };
    const result = applyLegacyDoctorMigrations(raw);

    expect(result.next).toBeNull();
    expect(result.changes).toHaveLength(0);
  });

  it("handles missing bindings array", () => {
    const raw = { agents: { entries: { main: { default: true } } } };
    const result = applyLegacyDoctorMigrations(raw);

    expect(result.next).toBeNull();
    expect(result.changes).toHaveLength(0);
  });
});
