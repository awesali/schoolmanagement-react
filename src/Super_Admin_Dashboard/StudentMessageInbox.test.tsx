// Test setup and fixtures
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import StudentMessageInbox from "./StudentMessageInbox";

// Constants and helper functions
const json = (data: unknown) => ({
  ok: true,
  json: async () => ({ success: true, data }),
});
beforeEach(() => {
  localStorage.setItem("token", "test-token");
});
afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

test("shows unread conversation first, opens only that student chat, and replies in it", async () => {
  const fetchMock = jest
    .fn()
    .mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/conversations"))
          return json([
            {
              studentId: 2,
              studentName: "New Student",
              lastMessage: "Need help",
              lastSentAt: "2026-09-27T10:00:00",
              lastFromStudent: true,
              unreadCount: 1,
            },
            {
              studentId: 1,
              studentName: "Older Student",
              lastMessage: "Thanks",
              lastSentAt: "2026-09-26T09:00:00",
              lastFromStudent: false,
              unreadCount: 0,
            },
          ]) as Response;
        if (url.endsWith("/conversations/2/read") && init?.method === "POST")
          return json(null) as Response;
        if (url.endsWith("/conversations/2") && init?.method === "POST")
          return json(null) as Response;
        if (url.endsWith("/conversations/2"))
          return json([
            {
              id: 7,
              body: "Need help",
              fromStudent: true,
              sentAt: "2026-09-27T10:00:00",
            },
          ]) as Response;
        throw new Error(url);
      },
    );
  global.fetch = fetchMock as jest.Mock;
  render(<StudentMessageInbox />);
  await screen.findByText("New Student");
  const list = screen.getByRole("navigation", {
    name: "Student conversations",
  });
  expect(within(list).getAllByRole("button")[0].textContent).toContain(
    "New Student",
  );
  expect(screen.getByLabelText("1 unread messages")).toBeTruthy();
  fireEvent.click(within(list).getAllByRole("button")[0]);
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/conversations/2/read"),
      expect.objectContaining({ method: "POST" }),
    ),
  );
  expect(
    within(document.querySelector(".smi-thread") as HTMLElement).getByText(
      "Need help",
    ),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Reply to student"), {
    target: { value: "I can help" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/conversations/2"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "I can help" }),
      }),
    ),
  );
});
