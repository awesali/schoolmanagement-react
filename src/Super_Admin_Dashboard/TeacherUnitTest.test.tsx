// Test setup and fixtures
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TeacherUnitTest from "./TeacherUnitTest";

test("teacher selects only the subject scheduled for each section", async () => {
  localStorage.setItem("token", "test-token");
  global.fetch = jest.fn(async (input: RequestInfo) =>
    String(input).endsWith("/teacher/unit-test")
      ? ({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response)
      : {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 10,
                className: "10th",
                sections: [
                  {
                    id: 101,
                    sectionName: "A",
                    subjects: [{ subjectId: 1, subjectName: "English" }],
                  },
                  {
                    id: 102,
                    sectionName: "B",
                    subjects: [{ subjectId: 2, subjectName: "Science" }],
                  },
                ],
              },
            ],
          }),
        },
  ) as jest.Mock;

  render(<TeacherUnitTest />);
  await waitFor(() =>
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0),
  );
  expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
    "/api/Exam/teacher/unit-test/classes",
  );

  expect(screen.queryByLabelText(/Class/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add unit test" }));
  expect(
    await screen.findByRole("option", { name: "10th" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Class/), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText(/Section/), {
    target: { value: "101" },
  });
  expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Science" }),
  ).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Section/), {
    target: { value: "102" },
  });
  await waitFor(() =>
    expect(screen.getByRole("option", { name: "Science" })).toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("option", { name: "English" }),
  ).not.toBeInTheDocument();
});
test("created test opens an edit form and saves changes through PUT", async () => {
  localStorage.setItem("token", "test-token");

  // Constants and helper functions
  const created = {
    id: 7,
    name: "English quiz",
    classId: 10,
    className: "10th",
    sectionId: 101,
    sectionName: "A",
    subjectId: 1,
    subjectName: "English",
    testDate: "2026-10-05T00:00:00",
    maxMarks: 50,
    passingMarks: 20,
    canEdit: true,
  };
  global.fetch = jest.fn(async (input: RequestInfo, options?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/teacher/unit-test/classes"))
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 10,
              className: "10th",
              sections: [
                {
                  id: 101,
                  sectionName: "A",
                  subjects: [{ subjectId: 1, subjectName: "English" }],
                },
              ],
            },
          ],
        }),
      } as Response;
    if (url.endsWith("/teacher/unit-test/7") && options?.method === "PUT") {
      created.name = JSON.parse(String(options.body)).name;
      return {
        ok: true,
        json: async () => ({ success: true, message: "Updated" }),
      } as Response;
    }
    return {
      ok: true,
      json: async () => ({ success: true, data: [created] }),
    } as Response;
  }) as jest.Mock;

  render(<TeacherUnitTest />);
  expect(await screen.findByText("English quiz")).toBeInTheDocument();
  expect(
    screen.queryByRole("textbox", { name: /Test name/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("textbox", { name: /Test name/ })).toHaveValue(
    "English quiz",
  );
  fireEvent.change(screen.getByRole("textbox", { name: /Test name/ }), {
    target: { value: "English unit quiz" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(screen.getByText("English unit quiz")).toBeInTheDocument(),
  );
  expect(
    (global.fetch as jest.Mock).mock.calls.some(
      ([url, options]) =>
        String(url).endsWith("/teacher/unit-test/7") &&
        options?.method === "PUT",
    ),
  ).toBe(true);
  await waitFor(() =>
    expect(
      screen.queryByRole("textbox", { name: /Test name/ }),
    ).not.toBeInTheDocument(),
  );
});
