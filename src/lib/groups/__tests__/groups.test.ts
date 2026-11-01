import { describe, expect, it } from "vitest";
import {
  assignmentOf,
  filterSnapshot,
  listViews,
  managedKey,
  resolveView,
  viewPredicate,
  type AccountAssignment,
} from "../groups";
import type { SnapshotResult } from "@/lib/snaptrade/types";

const assignments: AccountAssignment[] = [
  { accountId: "em", kind: "emergency", managedFor: null },
  { accountId: "f1", kind: "managed", managedFor: "Ravi" },
  { accountId: "f2", kind: "managed", managedFor: " ravi " },
];
const ids = ["inv1", "inv2", "em", "f1", "f2"];

describe("listViews", () => {
  it("offers my money, each group, each person and everything", () => {
    expect(listViews(ids, assignments).map((v) => [v.key, v.label])).toEqual([
      ["mine", "My money"],
      ["investments", "My investments"],
      ["emergency", "Emergency fund"],
      ["managed:ravi", "Ravi"],
      ["all", "Everything"],
    ]);
  });

  it("collapses to a single view when nothing is grouped", () => {
    expect(listViews(["a", "b"], []).map((v) => v.key)).toEqual(["investments"]);
  });

  it("ignores assignments for accounts that no longer exist", () => {
    expect(listViews(["inv1"], assignments).map((v) => v.key)).toEqual(["investments"]);
  });
});

describe("resolveView", () => {
  const views = listViews(ids, assignments);
  it("uses the requested view, then the page default", () => {
    expect(resolveView(views, "managed:ravi", "mine").key).toBe("managed:ravi");
    expect(resolveView(views, "bogus", "mine").key).toBe("mine");
    expect(resolveView(views, undefined, "investments").key).toBe("investments");
  });
  it("falls back to investments when 'mine' isn't offered", () => {
    expect(resolveView(listViews(["a"], []), undefined, "mine").key).toBe("investments");
  });
});

describe("viewPredicate", () => {
  const views = listViews(ids, assignments);
  const members = (key: string) => ids.filter(viewPredicate(resolveView(views, key, key), assignments));

  it("keeps managed accounts out of my money", () => {
    expect(members("mine")).toEqual(["inv1", "inv2", "em"]);
  });
  it("treats unassigned accounts as investments", () => {
    expect(members("investments")).toEqual(["inv1", "inv2"]);
    expect(assignmentOf("new", assignments).kind).toBe("investments");
  });
  it("groups a person's accounts regardless of spelling", () => {
    expect(managedKey("Ravi")).toBe(managedKey(" ravi "));
    expect(members("managed:ravi")).toEqual(["f1", "f2"]);
  });
  it("shows everything in 'all'", () => {
    expect(members("all")).toEqual(ids);
  });
});

describe("filterSnapshot", () => {
  it("filters accounts and failures together", () => {
    const acct = (id: string) => ({ account: { id } as never, positions: [] });
    const snap: SnapshotResult = {
      fetchedAt: "",
      accounts: [acct("inv1"), acct("f1")],
      failures: [{ accountId: "f2", accountName: "F2", message: "x" }, { accountId: "em", accountName: "E", message: "x" }],
    };
    const out = filterSnapshot(snap, (id) => id !== "f1" && id !== "f2");
    expect(out.accounts.map((s) => s.account.id)).toEqual(["inv1"]);
    expect(out.failures.map((f) => f.accountId)).toEqual(["em"]);
  });
});
