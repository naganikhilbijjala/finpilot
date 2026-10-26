import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listUserAccounts = vi.fn();
const getAllAccountPositions = vi.fn();
const getUserAccountBalance = vi.fn();
vi.mock("../client", () => ({
  getSnaptrade: () => ({
    accountInformation: {
      listUserAccounts,
      getAllAccountPositions,
      getUserAccountBalance,
    },
  }),
}));

import { clearSnapshotCache, fetchSnapshot } from "../snapshot";

const acct = (id: string, name: string) => ({
  id,
  name,
  number: "000011112222",
  institution_name: name,
  balance: { total: { amount: 1, currency: "USD" } },
  sync_status: {},
});

const positions = {
  data: {
    results: [
      {
        instrument: { kind: "etf", id: "v", symbol: "VOO" },
        units: "2",
        price: "10",
        cost_basis: "5",
        currency: "USD",
      },
    ],
  },
};

const sdkError = () =>
  new Error(
    'Request failed with status code 410 RESPONSE HEADERS: { "server": "do-not-leak" }'
  );

describe("fetchSnapshot", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearSnapshotCache();
  });

  it("reports a failing account without hiding the others", async () => {
    listUserAccounts.mockResolvedValue({
      data: [acct("a", "Fidelity"), acct("b", "Robinhood")],
    });
    getAllAccountPositions.mockImplementation(async ({ accountId }) => {
      if (accountId === "b") throw sdkError();
      return positions;
    });
    getUserAccountBalance.mockResolvedValue({ data: [{ cash: 7 }] });

    const result = await fetchSnapshot();
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].positions[0].ticker).toBe("VOO");
    expect(result.accounts[0].account.cash).toBe(7);
    expect(result.failures).toEqual([
      {
        accountId: "b",
        accountName: "Robinhood",
        message: "SnapTrade returned HTTP 410",
      },
    ]);
    const json = JSON.stringify(result);
    expect(json).not.toContain("do-not-leak");
    expect(json).not.toContain("000011112222");
  });

  it("still shows positions when only the balance call fails", async () => {
    listUserAccounts.mockResolvedValue({ data: [acct("a", "Fidelity")] });
    getAllAccountPositions.mockResolvedValue(positions);
    getUserAccountBalance.mockRejectedValue(sdkError());

    const result = await fetchSnapshot();
    expect(result.failures).toEqual([]);
    expect(result.accounts[0].account.cash).toBeNull();
    expect(result.accounts[0].positions).toHaveLength(1);
  });

  it("serves a second call from cache instead of re-hitting SnapTrade", async () => {
    listUserAccounts.mockResolvedValue({ data: [acct("a", "Fidelity")] });
    getAllAccountPositions.mockResolvedValue(positions);
    getUserAccountBalance.mockResolvedValue({ data: [{ cash: 7 }] });

    const first = await fetchSnapshot();
    const second = await fetchSnapshot();
    expect(second).toBe(first);
    expect(listUserAccounts).toHaveBeenCalledTimes(1);
  });

  it("throws when the account list cannot be fetched", async () => {
    listUserAccounts.mockRejectedValue(new Error("down"));
    await expect(fetchSnapshot()).rejects.toThrow("down");
  });
});
