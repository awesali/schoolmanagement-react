import { loadAdminSchools } from "./loadAdminSchools";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
test("returns linked schools and bypasses cached results", async () => {
  const request = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [{ id: 4, schoolName: "School" }],
      }),
    });
  global.fetch = request;
  await expect(loadAdminSchools()).resolves.toEqual([
    { id: 4, schoolName: "School" },
  ]);
  expect(request.mock.calls[0][1].cache).toBe("no-store");
});
test.each([401, 403, 500])(
  "does not treat HTTP %s as an empty school list",
  async (status) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
    await expect(loadAdminSchools()).rejects.toThrow();
  },
);
test("distinguishes an empty account from an invalid API response", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, message: "School lookup failed" }),
    });
  await expect(loadAdminSchools()).resolves.toEqual([]);
  await expect(loadAdminSchools()).rejects.toThrow("School lookup failed");
});
