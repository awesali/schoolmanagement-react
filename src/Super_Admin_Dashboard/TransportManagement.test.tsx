import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransportSetup } from "./TransportManagement";

const lookups = {
  sessions: [{ value: 7, label: "2026-27" }],
  vehicles: [{ value: 11, label: "Bus 11" }],
  drivers: [{ value: 12, label: "Driver 12" }],
  routes: [{ value: 13, label: "Route 13" }],
};
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test("assigns existing records together with an optional conductor", async () => {
  const request = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ data: { id: 20 } }) });
  global.fetch = request;
  const onSaved = jest.fn();
  render(<TransportSetup schoolId={2} lookups={lookups} onSaved={onSaved} />);
  fill("Vehicle details", "11");
  fill("Drivers details", "12");
  fill("Routes details", "13");
  fill("Academic Session *", "7");
  fill("Start Date *", "2026-10-18");
  fireEvent.click(screen.getByRole("button", { name: "Save Transport Setup" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toContain("/assignments");
  expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({
    schoolId: 2,
    vehicleId: 11,
    driverId: 12,
    routeId: 13,
    conductorId: null,
    academicSessionId: 7,
  });
});

test("keeps a completed new vehicle when assignment fails and retries without recreating it", async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 31 } }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Driver already assigned" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 40 } }),
    });
  global.fetch = request;
  render(<TransportSetup schoolId={2} lookups={lookups} onSaved={jest.fn()} />);
  fill("Vehicle Type *", "Bus");
  fill("Default Capacity *", "40");
  fill("Vehicle Number *", "BUS-31");
  fill("Vehicle Name *", "School bus");
  fill("Registration Number *", "REG-31");
  fill("Drivers details", "12");
  fill("Routes details", "13");
  fill("Academic Session *", "7");
  fill("Start Date *", "2026-10-18");
  fireEvent.click(screen.getByRole("button", { name: "Save Transport Setup" }));
  await screen.findByText(/Driver already assigned/);
  fireEvent.click(screen.getByRole("button", { name: "Save Transport Setup" }));
  await screen.findByText(/Transport setup saved/);
  expect(request.mock.calls.map(([url]) => url.split("/").pop())).toEqual([
    "vehicle-setup",
    "assignments",
    "assignments",
  ]);
  expect(JSON.parse(request.mock.calls[2][1].body).vehicleId).toBe(31);
});
