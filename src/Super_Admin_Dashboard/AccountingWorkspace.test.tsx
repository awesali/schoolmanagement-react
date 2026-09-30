// Test setup and fixtures
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountingWorkspace, {
  accountingCsvCell,
  draftTotals,
} from "./AccountingWorkspace";

// Constants and helper functions
const accounts = [
  { id: 1, code: "1000", name: "Cash", type: "Asset", isBank: false },
  { id: 2, code: "1010", name: "Bank", type: "Asset", isBank: true },
  { id: 3, code: "4000", name: "Fees", type: "Income", isBank: false },
];
const workspace = {
  accounts,
  report: accounts.map((a) => ({
    ...a,
    opening: 0,
    debit: 0,
    credit: 0,
    closing: 0,
  })),
  vouchers: [],
  total: 0,
  lockedThrough: null,
  audit: [],
  canCreate: true,
  canUpdate: true,
};
beforeEach(() => {
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { randomUUID: () => "23a01803-3c66-408a-b0f2-eb47b1e893b9" },
  });
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => workspace });
});
const show = async () => {
  render(<AccountingWorkspace />);
  await screen.findByText("Daily work");
};
test("balances decimal voucher lines and exports formula-safe cells", () => {
  expect(
    draftTotals([
      { accountId: "1", debit: "0.1", credit: "" },
      { accountId: "1", debit: "0.2", credit: "" },
      { accountId: "3", debit: "", credit: "0.3" },
    ]),
  ).toEqual({ debit: 0.3, credit: 0.3 });
  expect(accountingCsvCell("  =SUM(A1)")).toBe('"\'  =SUM(A1)"');
  expect(accountingCsvCell('A,"B"')).toBe('"A,""B"""');
});
test("saves a balanced voucher draft with school determined by the API", async () => {
  await show();
  fireEvent.click(screen.getByRole("tab", { name: "Vouchers" }));
  fireEvent.click(screen.getByRole("button", { name: "New voucher" }));
  fireEvent.change(screen.getByLabelText("Narration"), {
    target: { value: "School receipt" },
  });
  fireEvent.change(screen.getByLabelText("Line 1 account"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Line 1 debit"), {
    target: { value: "100" },
  });
  fireEvent.change(screen.getByLabelText("Line 2 account"), {
    target: { value: "3" },
  });
  fireEvent.change(screen.getByLabelText("Line 2 credit"), {
    target: { value: "99" },
  });
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Line 2 credit"), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(
      (fetch as jest.Mock).mock.calls.some(([, o]) => o.method === "POST"),
    ).toBe(true),
  );
  const body = JSON.parse(
    (fetch as jest.Mock).mock.calls.find(([, o]) => o.method === "POST")[1]
      .body,
  );
  expect(body.lines).toEqual([
    { accountId: 1, debit: 100, credit: 0 },
    { accountId: 3, debit: 0, credit: 100 },
  ]);
  expect(body.schoolId).toBeUndefined();
  expect(body.requestId).toBe("23a01803-3c66-408a-b0f2-eb47b1e893b9");
});
test("requires an explicit review step before posting", async () => {
  const v = {
    id: 20,
    date: "2026-01-01",
    kind: "Receipt",
    narration: "Receipt review",
    status: "Draft",
    revision: 2,
    requestId: "x",
    reference: "",
    createdBy: 1,
    lines: [
      { id: 1, accountId: 1, debit: 100, credit: 0 },
      { id: 2, accountId: 3, debit: 0, credit: 100 },
    ],
  };
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ ...workspace, vouchers: [v], total: 1 }),
  });
  await show();
  fireEvent.click(screen.getByRole("tab", { name: "Vouchers" }));
  fireEvent.click(screen.getByRole("button", { name: "Review V-20" }));
  fireEvent.click(screen.getByRole("button", { name: "Post voucher" }));
  expect(
    (fetch as jest.Mock).mock.calls.some(([, o]) => o.method === "PUT"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Confirm post" }));
  await waitFor(() =>
    expect(
      (fetch as jest.Mock).mock.calls.some(
        ([url, o]) =>
          url.endsWith("/vouchers/20/post") &&
          JSON.parse(o.body).revision === 2,
      ),
    ).toBe(true),
  );
});
test("read-only accountant cannot create or post vouchers", async () => {
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ ...workspace, canCreate: false, canUpdate: false }),
  });
  await show();
  fireEvent.click(screen.getByRole("tab", { name: "Vouchers" }));
  expect(
    screen.queryByRole("button", { name: "New voucher" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Audit & close" }));
  expect(screen.queryByLabelText("Lock books through")).not.toBeInTheDocument();
});
test("refresh failure clears stale financial data and permits retry", async () => {
  await show();
  (fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 403,
    json: async () => ({}),
  });
  fireEvent.click(screen.getByRole("button", { name: "Refresh books" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Accounting permission",
  );
  expect(screen.queryByText("Daily work")).not.toBeInTheDocument();
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => workspace,
  });
  fireEvent.click(screen.getByRole("button", { name: "Refresh books" }));
  expect(await screen.findByText("Daily work")).toBeInTheDocument();
});
test("bank reconciliation cannot save while a statement difference remains", async () => {
  (fetch as jest.Mock).mockImplementation(async (url) => ({
    ok: true,
    json: async () =>
      String(url).includes("/ledger?")
        ? { opening: 0, rows: [] }
        : String(url).includes("/bank?")
          ? { book: 200, uncleared: 50, reconciled: 150, history: [] }
          : workspace,
  }));
  await show();
  fireEvent.click(screen.getByRole("tab", { name: "Bank reconciliation" }));
  fireEvent.change(screen.getByLabelText("Bank account"), {
    target: { value: "2" },
  });
  fireEvent.change(
    await screen.findByLabelText("Bank statement closing balance"),
    { target: { value: "149" } },
  );
  expect(
    screen.getByRole("button", { name: "Save reconciled snapshot" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Bank statement closing balance"), {
    target: { value: "150" },
  });
  expect(
    screen.getByRole("button", { name: "Save reconciled snapshot" }),
  ).toBeEnabled();
});
