// Test setup and fixtures
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import StudentConversations from "./StudentConversations";

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

test("chooses staff by role, keeps chats separate, and marks an incoming chat read", async () => {
  const messages = [
    {
      id: 1,
      staffId: 10,
      staffName: "Ms Teacher",
      roleId: 2,
      body: "Teacher reply",
      fromStudent: false,
      sentAt: "2026-09-27T09:00:00",
      readAt: null,
    },
    {
      id: 2,
      staffId: 20,
      staffName: "Mr Principal",
      roleId: 3,
      body: "Principal reply",
      fromStudent: false,
      sentAt: "2026-09-27T10:00:00",
      readAt: null,
    },
  ];
  const fetchMock = jest
    .fn()
    .mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("message-recipients"))
          return json({
            roles: [
              { id: 2, roleName: "Teacher" },
              { id: 3, roleName: "Principal" },
              { id: 7, roleName: "Admin" },
            ],
            staff: [
              { id: 10, name: "Ms Teacher", roleId: 2 },
              { id: 20, name: "Mr Principal", roleId: 3 },
              { id: 70, name: "Admin User", roleId: 7 },
            ],
          }) as Response;
        if (url.endsWith("messages/20/read") && init?.method === "POST")
          return json(null) as Response;
        if (url.endsWith("messages") && init?.method === "POST")
          return json({ id: 3 }) as Response;
        if (url.endsWith("messages")) return json(messages) as Response;
        throw new Error(url);
      },
    );
  global.fetch = fetchMock as jest.Mock;
  render(<StudentConversations initialMessages={messages} />);
  await screen.findAllByText("1 new");
  await screen.findByRole("option", { name: "Principal" });
  expect(screen.queryByRole("option", { name: "Admin" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "3" } });
  expect(
    within(screen.getByLabelText("Staff member")).getByText("Mr Principal"),
  ).toBeTruthy();
  expect(
    within(screen.getByLabelText("Staff member")).queryByText("Ms Teacher"),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Staff member"), {
    target: { value: "20" },
  });
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("messages/20/read"),
      expect.objectContaining({ method: "POST" }),
    ),
  );
  const thread = document.querySelector(".scv-thread") as HTMLElement;
  expect(within(thread).getByText("Principal reply")).toBeTruthy();
  expect(within(thread).queryByText("Teacher reply")).toBeNull();
  fireEvent.change(screen.getByLabelText("Write message"), {
    target: { value: "Hello Principal" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/StudentPortal/messages"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          recipientRoleId: 3,
          staffId: 20,
          body: "Hello Principal",
        }),
      }),
    ),
  );
});
test("opens the notified staff conversation directly", async () => {
  const messages = [
    {
      id: 1,
      staffId: 10,
      staffName: "Ms Teacher",
      roleId: 2,
      body: "Teacher reply",
      fromStudent: false,
      sentAt: "2026-09-27T09:00:00",
      readAt: null,
    },
    {
      id: 2,
      staffId: 20,
      staffName: "Mr Principal",
      roleId: 3,
      body: "Principal reply",
      fromStudent: false,
      sentAt: "2026-09-27T10:00:00",
      readAt: null,
    },
  ];
  global.fetch = jest
    .fn()
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("message-recipients"))
        return json({
          roles: [
            { id: 2, roleName: "Teacher" },
            { id: 3, roleName: "Principal" },
          ],
          staff: [
            { id: 10, name: "Ms Teacher", roleId: 2 },
            { id: 20, name: "Mr Principal", roleId: 3 },
          ],
        });
      if (url.endsWith("messages")) return json(messages);
      if (url.endsWith("messages/20/read")) return json(null);
      throw new Error(url);
    }) as jest.Mock;
  render(
    <StudentConversations initialMessages={messages} initialStaffId={20} />,
  );
  const thread = document.querySelector(".scv-thread") as HTMLElement;
  await waitFor(() =>
    expect(within(thread).getByText("Principal reply")).toBeInTheDocument(),
  );
  expect(within(thread).queryByText("Teacher reply")).not.toBeInTheDocument();
});
